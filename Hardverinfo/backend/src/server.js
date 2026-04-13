import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { prisma } from './db.js';
import { createToken, authenticate } from './auth.js';
import { slugify } from './utils.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'A backend szerver elindult.' });
});

app.get('/api', (req, res) => {
  res.status(200).json({
    name: 'HardverInfo API',
    version: 'stage-3',
    endpoints: [
      'GET /health',
      'GET /api',
      'POST /auth/register',
      'POST /auth/login',
      'GET /posts',
      'GET /posts/:id',
      'POST /posts',
      'PATCH /posts/:id',
      'DELETE /posts/:id',
      'POST /posts/:id/comments'
    ]
  });
});

app.post('/auth/register', async (req, res) => {
  try {
    const { name, username, password } = req.body;
    if (!name || !username || !password) {
      return res.status(400).json({ message: 'Minden mező kitöltése kötelező.' });
    }

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return res.status(409).json({ message: 'A felhasználónév már foglalt.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        username,
        password: passwordHash,
        role: 'felhasznalo'
      }
    });

    const token = createToken(user);
    return res.status(201).json({
      token,
      user: { id: user.id, name: user.name, username: user.username, role: user.role }
    });
  } catch {
    return res.status(500).json({ message: 'Szerverhiba a regisztráció során.' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Felhasználónév és jelszó szükséges.' });
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).json({ message: 'Hibás belépési adatok.' });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(401).json({ message: 'Hibás belépési adatok.' });
    }

    const token = createToken(user);
    return res.status(200).json({
      token,
      user: { id: user.id, name: user.name, username: user.username, role: user.role }
    });
  } catch {
    return res.status(500).json({ message: 'Szerverhiba a belépés során.' });
  }
});

app.get('/posts', async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      include: { user: true, comments: true },
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json(posts);
  } catch {
    return res.status(500).json({ message: 'Nem sikerült lekérni a bejegyzéseket.' });
  }
});

app.get('/posts/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const post = await prisma.post.findUnique({
      where: { id },
      include: { user: true, comments: true }
    });

    if (!post) {
      return res.status(404).json({ message: 'A bejegyzés nem található.' });
    }

    return res.status(200).json(post);
  } catch {
    return res.status(500).json({ message: 'Nem sikerült lekérni a bejegyzést.' });
  }
});

app.post('/posts', authenticate, async (req, res) => {
  try {
    const { title, content, category } = req.body;
    if (!title || !content || !category) {
      return res.status(400).json({ message: 'Hiányzó bejegyzés adatok.' });
    }

    const post = await prisma.post.create({
      data: {
        userId: req.user.id,
        title,
        slug: `${slugify(title)}-${Date.now()}`,
        excerpt: content.slice(0, 140),
        content,
        category,
        status: 'published'
      }
    });

    return res.status(201).json(post);
  } catch {
    return res.status(500).json({ message: 'Nem sikerült létrehozni a bejegyzést.' });
  }
});

app.patch('/posts/:id', authenticate, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.post.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'A bejegyzés nem található.' });
    }

    if (existing.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Nincs jogosultság a módosításhoz.' });
    }

    const updated = await prisma.post.update({
      where: { id },
      data: {
        title: req.body.title ?? existing.title,
        content: req.body.content ?? existing.content,
        excerpt: (req.body.content ?? existing.content).slice(0, 140),
        category: req.body.category ?? existing.category,
        status: req.body.status ?? existing.status
      }
    });

    return res.status(200).json(updated);
  } catch {
    return res.status(500).json({ message: 'Nem sikerült módosítani a bejegyzést.' });
  }
});

app.delete('/posts/:id', authenticate, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await prisma.post.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ message: 'A bejegyzés nem található.' });
    }

    if (existing.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Nincs jogosultság a törléshez.' });
    }

    await prisma.post.delete({ where: { id } });
    return res.status(200).json({ message: 'A bejegyzés törölve.' });
  } catch {
    return res.status(500).json({ message: 'Nem sikerült törölni a bejegyzést.' });
  }
});

app.post('/posts/:id/comments', async (req, res) => {
  try {
    const postId = Number(req.params.id);
    const { content, guestName, userId } = req.body;

    if (!content) {
      return res.status(400).json({ message: 'A komment tartalma kötelező.' });
    }

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      return res.status(404).json({ message: 'A bejegyzés nem található.' });
    }

    const comment = await prisma.comment.create({
      data: {
        postId,
        userId: userId ?? null,
        guestName: guestName ?? null,
        content,
        status: 'approved'
      }
    });

    return res.status(201).json(comment);
  } catch {
    return res.status(500).json({ message: 'Nem sikerült elmenteni a kommentet.' });
  }
});

app.listen(PORT, () => {
  console.log(`HardverInfo backend fut a ${PORT} porton`);
});
