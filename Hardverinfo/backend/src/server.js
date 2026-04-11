import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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
    version: 'stage-1',
    endpoints: [
      'GET /health',
      'GET /api'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`HardverInfo backend fut a ${PORT} porton`);
});
