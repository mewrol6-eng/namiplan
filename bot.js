import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import pkg from 'pg';

dotenv.config();

const { Pool } = pkg;

const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: true
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("localhost")
    ? false
    : { rejectUnauthorized: false }
});

/* =========================
   HELPERS
========================= */
async function registerUser(msg) {
  const telegramId = msg.from.id;
  const username = msg.from.username || null;
  const firstName = msg.from.first_name || null;

  await pool.query(
    `
    INSERT INTO users (telegram_id, username, first_name)
    VALUES ($1, $2, $3)
    ON CONFLICT (telegram_id)
    DO UPDATE SET username=$2, first_name=$3
    `,
    [telegramId, username, firstName]
  );

  return telegramId;
}

/* =========================
   COMMANDS
========================= */

// /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    await registerUser(msg);

    await bot.sendMessage(chatId, 'Добро пожаловать 👋', {
      reply_markup: {
        keyboard: [
          [
            {
              text: '🚀 Открыть приложение',
              web_app: {
                url: process.env.WEB_APP_URL
              }
            }
          ],
          ['➕ Добавить задачу']
        ],
        resize_keyboard: true
      }
    });
  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, 'Ошибка регистрации');
  }
});

// add task flow
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  if (text === '➕ Добавить задачу') {
    bot.sendMessage(chatId, 'Напиши текст задачи:');
    bot.once('message', async (taskMsg) => {
      try {
        const telegramId = taskMsg.from.id;
        const title = taskMsg.text;

        const userRes = await pool.query(
          'SELECT id FROM users WHERE telegram_id=$1',
          [telegramId]
        );

        if (userRes.rows.length === 0) {
          return bot.sendMessage(chatId, 'Пользователь не найден');
        }

        await pool.query(
          'INSERT INTO tasks (user_id, title) VALUES ($1, $2)',
          [userRes.rows[0].id, title]
        );

        bot.sendMessage(chatId, '✅ Задача добавлена');
      } catch (err) {
        console.error(err);
        bot.sendMessage(chatId, 'Ошибка добавления задачи');
      }
    });
  }
});

/* =========================
   LOG
========================= */
console.log('Telegram bot is running');
