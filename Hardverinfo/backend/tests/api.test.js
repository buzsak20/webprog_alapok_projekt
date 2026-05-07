import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { prisma } from '../src/db.js';

process.env.NODE_ENV = 'test';
const { default: app } = await import('../src/server.js');

const unique = Date.now();

const userData = {
  name: 'Teszt Elek',
  username: `teszt_${unique}`,
  password: 'titkos123'
};

const secondUserData = {
  name: 'Masodik User',
  username: `masodik_${unique}`,
  password: 'titkos456'
};

const adminLogin = {
  username: 'buzsak',
  password: 'admin'
};

let token = '';
let secondUserToken = '';
let adminToken = '';

let createdUserId = null;
let secondUserId = null;
let createdPostId = null;
let secondUserPostId = null;
let createdCommentId = null;

test('health endpoint válaszol', async () => {
  const res = await request(app).get('/health');

  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
});

test('register endpoint létrehoz első felhasználót', async () => {
  const res = await request(app)
    .post('/auth/register')
    .send(userData);

  assert.equal(res.status, 201);
  assert.ok(res.body.token);
  assert.equal(res.body.user.username, userData.username);

  token = res.body.token;
  createdUserId = res.body.user.id;
});

test('register endpoint létrehoz második felhasználót', async () => {
  const res = await request(app)
    .post('/auth/register')
    .send(secondUserData);

  assert.equal(res.status, 201);
  assert.ok(res.body.token);
  assert.equal(res.body.user.username, secondUserData.username);

  secondUserToken = res.body.token;
  secondUserId = res.body.user.id;
});

test('register endpoint hibát ad hiányzó mezőkre', async () => {
  const res = await request(app)
    .post('/auth/register')
    .send({ username: 'hianyos' });

  assert.equal(res.status, 400);
});

test('login endpoint JWT tokent ad vissza', async () => {
  const res = await request(app)
    .post('/auth/login')
    .send({
      username: userData.username,
      password: userData.password
    });

  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  assert.equal(res.body.user.username, userData.username);

  token = res.body.token;
});

test('admin be tud jelentkezni', async () => {
  const res = await request(app)
    .post('/auth/login')
    .send(adminLogin);

  assert.equal(res.status, 200);
  assert.ok(res.body.token);
  assert.equal(res.body.user.username, adminLogin.username);
  assert.equal(res.body.user.role, 'admin');

  adminToken = res.body.token;
});

test('login endpoint hibát ad rossz jelszóra', async () => {
  const res = await request(app)
    .post('/auth/login')
    .send({
      username: userData.username,
      password: 'rosszjelszo'
    });

  assert.equal(res.status, 401);
});

test('posts endpoint lista lekérésre szolgál', async () => {
  const res = await request(app).get('/posts');

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body));
});

test('authentikált felhasználó létrehozhat bejegyzést', async () => {
  const res = await request(app)
    .post('/posts')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Teszt bejegyzés',
      content: 'Ez egy automata tesztből létrehozott bejegyzés.',
      category: 'Intel'
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.title, 'Teszt bejegyzés');
  assert.equal(res.body.status, 'published');

  createdPostId = res.body.id;
});

test('második felhasználó is létrehozhat bejegyzést', async () => {
  const res = await request(app)
    .post('/posts')
    .set('Authorization', `Bearer ${secondUserToken}`)
    .send({
      title: 'Masodik user posztja',
      content: 'Másik felhasználó posztja teszteléshez.',
      category: 'AMD'
    });

  assert.equal(res.status, 201);
  secondUserPostId = res.body.id;
});

test('GET /posts/:id visszaadja a létrehozott bejegyzést', async () => {
  const res = await request(app).get(`/posts/${createdPostId}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.id, createdPostId);
  assert.equal(res.body.title, 'Teszt bejegyzés');
});

test('bejegyzéshez lehet kommentet létrehozni', async () => {
  const res = await request(app)
    .post(`/posts/${createdPostId}/comments`)
    .send({
      content: 'Ez egy teszt komment',
      guestName: 'Vendég'
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.status, 'pending');

  createdCommentId = res.body.id;
});

test('saját bejegyzést lehet módosítani', async () => {
  const res = await request(app)
    .patch(`/posts/${createdPostId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Módosított teszt bejegyzés',
      content: 'Módosított tartalom'
    });

  assert.equal(res.status, 200);
  assert.equal(res.body.title, 'Módosított teszt bejegyzés');
  assert.equal(res.body.content, 'Módosított tartalom');
});

test('más felhasználó bejegyzését normál user nem módosíthatja', async () => {
  const res = await request(app)
    .patch(`/posts/${createdPostId}`)
    .set('Authorization', `Bearer ${secondUserToken}`)
    .send({
      title: 'Tiltott módosítás'
    });

  assert.equal(res.status, 403);
});

test('admin jóvá tud hagyni kommentet', async () => {
  const res = await request(app)
    .patch(`/comments/${createdCommentId}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      status: 'approved'
    });

  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'approved');
});

test('normál user nem érheti el az admin overview végpontot', async () => {
  const res = await request(app)
    .get('/admin/overview')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(res.status, 403);
});

test('admin elérheti az admin overview végpontot', async () => {
  const res = await request(app)
    .get('/admin/overview')
    .set('Authorization', `Bearer ${adminToken}`);

  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.posts));
  assert.ok(Array.isArray(res.body.comments));
  assert.ok(Array.isArray(res.body.users));
});

test('normál user nem törölheti más felhasználó bejegyzését', async () => {
  const res = await request(app)
    .delete(`/posts/${secondUserPostId}`)
    .set('Authorization', `Bearer ${token}`);

  assert.equal(res.status, 403);
});

test('admin törölheti más felhasználó bejegyzését', async () => {
  const res = await request(app)
    .delete(`/posts/${secondUserPostId}`)
    .set('Authorization', `Bearer ${adminToken}`);

  assert.equal(res.status, 200);
});

test('admin nem törölheti saját magát', async () => {
  const adminUser = await prisma.user.findUnique({
    where: { username: adminLogin.username }
  });

  const res = await request(app)
    .delete(`/users/${adminUser.id}`)
    .set('Authorization', `Bearer ${adminToken}`);

  assert.equal(res.status, 400);
});

test('admin törölheti a második tesztfelhasználót', async () => {
  const res = await request(app)
    .delete(`/users/${secondUserId}`)
    .set('Authorization', `Bearer ${adminToken}`);

  assert.equal(res.status, 200);
});

test('saját bejegyzést lehet törölni', async () => {
  const res = await request(app)
    .delete(`/posts/${createdPostId}`)
    .set('Authorization', `Bearer ${token}`);

  assert.equal(res.status, 200);
});

test.after(async () => {
  if (createdCommentId) {
    await prisma.comment.deleteMany({ where: { id: createdCommentId } });
  }

  if (createdPostId) {
    await prisma.comment.deleteMany({ where: { postId: createdPostId } });
    await prisma.post.deleteMany({ where: { id: createdPostId } });
  }

  if (secondUserPostId) {
    await prisma.comment.deleteMany({ where: { postId: secondUserPostId } });
    await prisma.post.deleteMany({ where: { id: secondUserPostId } });
  }

  if (createdUserId) {
    await prisma.user.deleteMany({ where: { id: createdUserId } });
  }

  if (secondUserId) {
    await prisma.user.deleteMany({ where: { id: secondUserId } });
  }

  await prisma.$disconnect();
});