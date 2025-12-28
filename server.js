import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import pkg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function calcMood(points) {
  if (points <= -2) return 'angry';
  if (points <= 0) return 'sad';
  if (points <= 3) return 'calm';
  return 'happy';
}

function worsenMood(mood) {
  if (mood === 'happy') return 'calm';
  if (mood === 'calm') return 'angry';
  return 'angry';
}

function isSameDay(a, b) {
  if (!a || !b) return false;
  return a.toDateString() === b.toDateString();
}

function isYesterday(a, b) {
  if (!a || !b) return false;
  const d = new Date(b);
  d.setDate(d.getDate() - 1);
  return a.toDateString() === d.toDateString();
}

function calcLevel(points, streak) {
  const baseLevel = Math.floor((points || 0) / 5) + 1;
  const streakBonus = Math.floor((streak || 0) / 3);
  return Math.max(1, baseLevel + streakBonus);
}

async function giveRewardIfNotExists(userId, type, value) {
  await pool.query(
    `
    INSERT INTO rewards (user_id, type, value)
    VALUES ($1, $2, $3)
    ON CONFLICT DO NOTHING
    `,
    [userId, type, value]
  );
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
    await pool.query(
      `
      INSERT INTO pets (user_id)
      VALUES ($1)
      ON CONFLICT (user_id) DO NOTHING
      `,
      [result.rows[0].id]
    );
    res.json({ user: result.rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/pet/:telegram_id', async (req, res) => {
  const telegramId = req.params.telegram_id;

  try {
    const u = await pool.query(
      'SELECT id FROM users WHERE telegram_id=$1',
      [telegramId]
    );

    if (u.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const p = await pool.query(
      'SELECT * FROM pets WHERE user_id=$1',
      [u.rows[0].id]
    );

    res.json(p.rows[0]);
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

    const task = t.rows[0];

    // DAILY TASK LOGIC
    if (task.type === 'daily') {
      const last = task.last_completed_at
        ? new Date(task.last_completed_at)
        : null;
      const now = new Date();

      if (last && isSameDay(last, now)) {
        return res
          .status(400)
          .json({ error: 'Daily task already completed today' });
      }

      // daily даёт больше очков питомцу
      await pool.query(
        `
        UPDATE pets
        SET points = points + 2
        WHERE user_id = (
          SELECT user_id FROM tasks WHERE id=$1
        )
        `,
        [taskId]
      );

      await pool.query(
        `
        UPDATE tasks
        SET last_completed_at = NOW()
        WHERE id=$1
        `,
        [taskId]
      );
    }

    const pointsToAdd = task.type === 'daily' ? 0 : 1;

    const petUpdate = await pool.query(
      `
      UPDATE pets
      SET points = points + $1,
          updated_at = NOW()
      WHERE user_id = (
        SELECT user_id FROM tasks WHERE id=$2
      )
      RETURNING points
      `,
      [pointsToAdd, taskId]
    );

    const newMood = calcMood(petUpdate.rows[0].points);

    await pool.query(
      `
      UPDATE pets
      SET mood=$1
      WHERE user_id = (
        SELECT user_id FROM tasks WHERE id=$2
      )
      `,
      [newMood, taskId]
    );

    await pool.query(
      `
      UPDATE pets
      SET last_action_at = NOW()
      WHERE user_id = (
        SELECT user_id FROM tasks WHERE id=$1
      )
      `,
      [taskId]
    );

    const today = new Date();

    const petRow = await pool.query(
      `
      SELECT streak, last_streak_date
      FROM pets
      WHERE user_id = (
        SELECT user_id FROM tasks WHERE id=$1
      )
      `,
      [taskId]
    );

    if (petRow.rows.length > 0) {
      const { streak, last_streak_date } = petRow.rows[0];
      let newStreak = streak || 0;

      if (!last_streak_date) {
        newStreak = 1;
      } else if (isSameDay(new Date(last_streak_date), today)) {
        // streak уже засчитан сегодня
      } else if (isYesterday(new Date(last_streak_date), today)) {
        newStreak = streak + 1;
      } else {
        newStreak = 1;
      }

      await pool.query(
        `
        UPDATE pets
        SET streak=$1,
            last_streak_date=CURRENT_DATE
        WHERE user_id = (
          SELECT user_id FROM tasks WHERE id=$2
        )
        `,
        [newStreak, taskId]
      );

      const petForLevel = await pool.query(
        `
        SELECT points, streak
        FROM pets
        WHERE user_id = (
          SELECT user_id FROM tasks WHERE id=$1
        )
        `,
        [taskId]
      );

      if (petForLevel.rows.length > 0) {
        const { points, streak } = petForLevel.rows[0];
        const newLevel = calcLevel(points, streak);

        await pool.query(
          `
          UPDATE pets
          SET level=$1
          WHERE user_id = (
            SELECT user_id FROM tasks WHERE id=$2
          )
          `,
          [newLevel, taskId]
        );

        const uidRes = await pool.query(
          `SELECT user_id FROM tasks WHERE id=$1`,
          [taskId]
        );

        if (uidRes.rows.length) {
          const userId = uidRes.rows[0].user_id;

          // награда за уровень — каждые 5 уровней
          if (newLevel > 0 && newLevel % 5 === 0) {
            await giveRewardIfNotExists(userId, 'level', newLevel);
          }

          // награда за streak — каждые 7 дней
          if (newStreak > 0 && newStreak % 7 === 0) {
            await giveRewardIfNotExists(userId, 'streak', newStreak);
          }
        }
      }
    }

    if (t.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(t.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'DB error' });
  }
});


setInterval(async () => {
  try {
    await pool.query(
      `
      UPDATE tasks
      SET status='new'
      WHERE type='daily'
        AND (
          last_completed_at IS NULL
          OR last_completed_at < NOW() - INTERVAL '1 day'
        )
      `
    );
  } catch (e) {
    console.error('Daily reset error', e);
  }
}, 60 * 60 * 1000); // сброс daily раз в час

setInterval(async () => {
  try {
    const res = await pool.query(
      `
      SELECT id, mood
      FROM pets
      WHERE last_action_at < NOW() - INTERVAL '24 hours'
      `
    );

    for (const pet of res.rows) {
      const newMood = worsenMood(pet.mood);

      await pool.query(
        `
        UPDATE pets
        SET mood=$1,
            last_action_at = NOW()
        WHERE id=$2
        `,
        [newMood, pet.id]
      );
    }
  } catch (e) {
    console.error('Auto mood error', e);
  }
}, 60 * 60 * 1000); // проверка каждый час

setInterval(async () => {
  try {
    await pool.query(
      `
      UPDATE pets
      SET streak = 0
      WHERE last_streak_date < CURRENT_DATE - INTERVAL '1 day'
      `
    );
  } catch (e) {
    console.error('Streak reset error', e);
  }
}, 60 * 60 * 1000);


app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server on ${PORT}`));
