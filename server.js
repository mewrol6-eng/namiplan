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
  ssl: process.env.DATABASE_URL.includes('localhost')
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
app.get('/', (req, res) => {
  res.send('Backend is working');
});

// AUTH
app.post('/auth/telegram', async (req, res) => {
  const { initData } = req.body;
  if (!initData) return res.status(400).json({ error: 'initData required' });

  if (!checkTelegramAuth(initData)) {
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
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'DB error' });
  }
});

// GET TASKS
app.get('/tasks/:telegram_id', async (req, res) => {
  const telegramId = req.params.telegram_id;
  try {
    const u = await pool.query(
      'SELECT id FROM users WHERE telegram_id=$1',
      [telegramId]
    );
    if (u.rows.length === 0) return res.json([]);

    const t = await pool.query(
      'SELECT * FROM tasks WHERE user_id=$1 ORDER BY id DESC',
      [u.rows[0].id]
    );
    res.json(t.rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'DB error' });
  }
});

// ADD TASK
app.post('/tasks', async (req, res) => {
  const { telegram_id, title } = req.body;
  if (!telegram_id || !title) {
    return res.status(400).json({ error: 'telegram_id and title required' });
  }

  try {
    const u = await pool.query(
      'SELECT id FROM users WHERE telegram_id=$1',
      [telegram_id]
    );
    if (u.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const task = await pool.query(
      'INSERT INTO tasks (user_id, title) VALUES ($1, $2) RETURNING *',
      [u.rows[0].id, title]
    );
    res.json(task.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'DB error' });
  }
});

// UPDATE TASK STATUS (new → done)
app.patch('/tasks/:id', async (req, res) => {
  const taskId = req.params.id;
  const { status } = req.body;
  if (!status) return res.status(400).json({ error: 'status required' });

  try {
    const t = await pool.query(
      'UPDATE tasks SET status=$1 WHERE id=$2 RETURNING *',
      [status, taskId]
    );
    if (t.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(t.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'DB error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on ${PORT}`));
