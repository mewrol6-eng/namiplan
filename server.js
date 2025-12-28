import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import pkg from 'pg';

dotenv.config();

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("localhost")
    ? false
    : { rejectUnauthorized: false }
});

/* =========================
   TELEGRAM WEB APP CHECK
========================= */
function checkTelegramAuth(initData) {
  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  params.delete('hash');

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secret = crypto
    .createHash('sha256')
    .update(process.env.BOT_TOKEN)
    .digest();

  const hmac = crypto
    .createHmac('sha256', secret)
    .update(dataCheckString)
    .digest('hex');

  return hmac === hash;
}

/* =========================
   API
========================= */

// health check
app.get('/', (req, res) => {
  res.send('Backend is working');
});

// auth from telegram web app
app.post('/auth/telegram', async (req, res) => {
  const { initData } = req.body;

  if (!initData) {
    return res.status(400).json({ error: 'initData required' });
  }

  const valid = checkTelegramAuth(initData);
  if (!valid) {
    return res.status(403).json({ error: 'Invalid Telegram signature' });
  }

  const params = new URLSearchParams(initData);
  const user = JSON.parse(params.get('user'));

  const { id, username, first_name } = user;

  try {
    const result = await pool.query(
      `
      INSERT INTO users (telegram_id, username, first_name)
      VALUES ($1, $2, $3)
      ON CONFLICT (telegram_id)
      DO UPDATE SET username=$2, first_name=$3
      RETURNING *
      `,
      [id, username, first_name]
    );

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// get user tasks
app.get('/tasks/:telegram_id', async (req, res) => {
  const telegramId = req.params.telegram_id;

  try {
    const userRes = await pool.query(
      'SELECT id FROM users WHERE telegram_id=$1',
      [telegramId]
    );

    if (userRes.rows.length === 0) {
      return res.json([]);
    }

    const tasks = await pool.query(
      'SELECT * FROM tasks WHERE user_id=$1 ORDER BY id DESC',
      [userRes.rows[0].id]
    );

    res.json(tasks.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

// add task (from bot or admin)
app.post('/tasks', async (req, res) => {
  const { telegram_id, title } = req.body;

  if (!telegram_id || !title) {
    return res.status(400).json({ error: 'telegram_id and title required' });
  }

  try {
    const userRes = await pool.query(
      'SELECT id FROM users WHERE telegram_id=$1',
      [telegram_id]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const task = await pool.query(
      'INSERT INTO tasks (user_id, title) VALUES ($1, $2) RETURNING *',
      [userRes.rows[0].id, title]
    );

    res.json(task.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
