const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = new sqlite3.Database(path.join(__dirname, 'namiplan.db'));
        this.initDatabase();
    }

    initDatabase() {
        // Таблица пользователей
        this.db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                telegram_id INTEGER UNIQUE,
                username TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Таблица заданий
        this.db.run(`
            CREATE TABLE IF NOT EXISTS tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                title TEXT NOT NULL,
                description TEXT,
                due_date DATETIME,
                completed BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);

        // Таблица состояния питомца
        this.db.run(`
            CREATE TABLE IF NOT EXISTS pet_status (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER UNIQUE,
                mood INTEGER DEFAULT 50, -- 0-100 шкала
                last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);
    }

    // Методы для работы с пользователями
    async getUser(telegramId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM users WHERE telegram_id = ?',
                [telegramId],
                (err, row) => {
                    if (err) reject(err);
                    resolve(row);
                }
            );
        });
    }

    async createUser(telegramId, username) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'INSERT OR IGNORE INTO users (telegram_id, username) VALUES (?, ?)',
                [telegramId, username],
                function(err) {
                    if (err) reject(err);
                    resolve(this.lastID);
                }
            );
        });
    }

    // Методы для заданий
    async getTasks(userId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM tasks WHERE user_id = ? ORDER BY due_date',
                [userId],
                (err, rows) => {
                    if (err) reject(err);
                    resolve(rows);
                }
            );
        });
    }

    async createTask(userId, taskData) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `INSERT INTO tasks (user_id, title, description, due_date, completed) 
                 VALUES (?, ?, ?, ?, ?)`,
                [userId, taskData.title, taskData.description, 
                 taskData.dueDate, taskData.completed || false],
                function(err) {
                    if (err) reject(err);
                    resolve(this.lastID);
                }
            );
        });
    }

    async updateTaskStatus(taskId, completed) {
        return new Promise((resolve, reject) => {
            this.db.run(
                'UPDATE tasks SET completed = ? WHERE id = ?',
                [completed, taskId],
                (err) => {
                    if (err) reject(err);
                    resolve(true);
                }
            );
        });
    }

    // Методы для состояния питомца
    async getPetStatus(userId) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM pet_status WHERE user_id = ?',
                [userId],
                (err, row) => {
                    if (err) reject(err);
                    if (!row) {
                        // Создаем начальное состояние
                        this.db.run(
                            'INSERT INTO pet_status (user_id, mood) VALUES (?, 50)',
                            [userId]
                        );
                        resolve({ mood: 50 });
                    } else {
                        resolve(row);
                    }
                }
            );
        });
    }

    async updatePetMood(userId, delta) {
        return new Promise((resolve, reject) => {
            this.db.run(
                `UPDATE pet_status 
                 SET mood = MAX(0, MIN(100, mood + ?)), 
                     last_updated = CURRENT_TIMESTAMP 
                 WHERE user_id = ?`,
                [delta, userId],
                (err) => {
                    if (err) reject(err);
                    this.getPetStatus(userId).then(resolve).catch(reject);
                }
            );
        });
    }

    close() {
        this.db.close();
    }
}

module.exports = new Database();
