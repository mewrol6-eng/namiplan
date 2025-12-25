class NamiPlanApp {
    constructor() {
        this.tg = window.Telegram.WebApp;
        this.user = null;
        this.tasks = [];
        this.petStatus = { mood: 50 };
        this.currentFilter = 'all';
        
        this.API_URL = 'http://localhost:3000/api'; // Замените на ваш URL
        
        // Видео состояния питомца
        this.petVideos = {
            angry: './assets/videos/angry.mp4',
            calm: './assets/videos/calm.mp4',
            happy: './assets/videos/happy.mp4',
            angryToCalm: './assets/videos/angry_to_calm.mp4',
            calmToAngry: './assets/videos/calm_to_angry.mp4',
            calmToHappy: './assets/videos/calm_to_happy.mp4',
            happyToCalm: './assets/videos/happy_to_calm.mp4'
        };
        
        this.init();
    }

    async init() {
        // Инициализация Telegram Web App
        this.tg.expand();
        this.tg.enableClosingConfirmation();
        
        // Получаем данные пользователя из Telegram
        const initData = this.tg.initDataUnsafe;
        this.user = {
            telegramId: initData.user?.id,
            username: initData.user?.username || `User${initData.user?.id}`
        };
        
        try {
            // Инициализируем пользователя на сервере
            const response = await this.fetchAPI('/init', {
                method: 'POST',
                body: JSON.stringify({
                    telegramId: this.user.telegramId,
                    username: this.user.username
                })
            });
            
            if (response.success) {
                this.user.id = response.data.user.id;
                this.tasks = response.data.tasks || [];
                this.petStatus = response.data.petStatus;
                
                this.updateUI();
                this.setupEventListeners();
                this.updatePetVideo();
            }
        } catch (error) {
            console.error('Ошибка инициализации:', error);
            this.showError('Не удалось загрузить данные');
        }
    }

    async fetchAPI(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };
        
        const response = await fetch(`${this.API_URL}${endpoint}`, {
            ...defaultOptions,
            ...options
        });
        
        return await response.json();
    }

    setupEventListeners() {
        // Добавление задания
        document.getElementById('addTaskBtn').addEventListener('click', () => {
            this.addTask();
        });

        // Фильтры
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.dataset.filter;
                this.renderTasks();
            });
        });

        // Модальное окно
        const modal = document.getElementById('taskModal');
        const closeBtn = document.querySelector('.close-modal');
        
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    async addTask() {
        const title = document.getElementById('taskTitle').value.trim();
        const description = document.getElementById('taskDescription').value.trim();
        const dueDate = document.getElementById('taskDueDate').value;
        
        if (!title) {
            this.showError('Введите название задания');
            return;
        }
        
        try {
            const response = await this.fetchAPI('/tasks', {
                method: 'POST',
                body: JSON.stringify({
                    userId: this.user.id,
                    title,
                    description,
                    dueDate: dueDate || null,
                    completed: false
                })
            });
            
            if (response.success) {
                this.tasks.push(response.data);
                this.renderTasks();
                this.updateStats();
                
                // Сброс формы
                document.getElementById('taskTitle').value = '';
                document.getElementById('taskDescription').value = '';
                document.getElementById('taskDueDate').value = '';
                
                this.showSuccess('Задание добавлено!');
            }
        } catch (error) {
            this.showError('Не удалось добавить задание');
        }
    }

    async toggleTaskCompletion(taskId, completed) {
        try {
            const response = await this.fetchAPI(`/tasks/${taskId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    completed: completed,
                    userId: this.user.id
                })
            });
            
            if (response.success) {
                const task = this.tasks.find(t => t.id === taskId);
                if (task) {
                    task.completed = completed;
                    this.petStatus = response.data.petStatus;
                    this.renderTasks();
                    this.updateStats();
                    this.updatePetVideo();
                }
                
                const message = completed ? 'Задание выполнено!' : 'Задание отменено';
                this.showSuccess(message);
            }
        } catch (error) {
            this.showError('Не удалось обновить задание');
        }
    }

    renderTasks() {
        const tasksList = document.getElementById('tasksList');
        tasksList.innerHTML = '';
        
        const filteredTasks = this.filterTasks(this.tasks);
        
        if (filteredTasks.length === 0) {
            tasksList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-check-circle"></i>
                    <p>Нет заданий</p>
                </div>
            `;
            return;
        }
        
        filteredTasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;
            
            const dueDate = task.due_date ? new Date(task.due_date) : null;
            const now = new Date();
            const isUrgent = dueDate && (dueDate - now) < 24 * 60 * 60 * 1000;
            
            if (isUrgent && !task.completed) {
                taskElement.classList.add('urgent');
            }
            
            taskElement.innerHTML = `
                <div class="task-content">
                    <div class="task-title">${this.escapeHtml(task.title)}</div>
                    ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
                    ${dueDate ? `
                        <div class="task-date">
                            <i class="far fa-calendar"></i>
                            ${dueDate.toLocaleDateString()} ${dueDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                    ` : ''}
                </div>
                <div class="task-actions">
                    <label class="checkbox-container">
                        <input type="checkbox" ${task.completed ? 'checked' : ''} 
                               onchange="app.toggleTaskCompletion(${task.id}, this.checked)">
                        <span class="checkmark"></span>
                    </label>
                </div>
            `;
            
            tasksList.appendChild(taskElement);
        });
    }

    filterTasks(tasks) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch (this.currentFilter) {
            case 'today':
                return tasks.filter(task => {
                    if (!task.due_date) return false;
                    const taskDate = new Date(task.due_date);
                    return taskDate >= today && taskDate < new Date(today.getTime() + 24 * 60 * 60 * 1000);
                });
            case 'pending':
                return tasks.filter(task => !task.completed);
            case 'completed':
                return tasks.filter(task => task.completed);
            default:
                return tasks;
        }
    }

    updateStats() {
        const todayTasks = this.tasks.filter(task => {
            if (!task.due_date) return false;
            const taskDate = new Date(task.due_date);
            const today = new Date();
            return taskDate.getDate() === today.getDate() &&
                   taskDate.getMonth() === today.getMonth() &&
                   taskDate.getFullYear() === today.getFullYear();
        }).length;
        
        const completedTasks = this.tasks.filter(task => task.completed).length;
        
        document.getElementById('todayTasks').textContent = todayTasks;
        document.getElementById('completedTasks').textContent = completedTasks;
        document.getElementById('moodPercent').textContent = `${this.petStatus.mood}%`;
    }

    updatePetVideo() {
        const videoElement = document.getElementById('petVideo');
        const moodFill = document.getElementById('moodFill');
        const moodText = document.getElementById('moodText');
        
        // Обновляем шкалу настроения
        moodFill.style.width = `${this.petStatus.mood}%`;
        
        // Определяем состояние питомца
        let moodState = 'calm';
        let moodDescription = 'Спокойный';
        
        if (this.petStatus.mood >= 80) {
            moodState = 'happy';
            moodDescription = 'Очень радостный';
        } else if (this.petStatus.mood >= 60) {
            moodState = 'calm';
            moodDescription = 'Спокойный';
        } else if (this.petStatus.mood >= 40) {
            moodState = 'calm';
            moodDescription = 'Нейтральный';
        } else if (this.petStatus.mood >= 20) {
            moodState = 'calm';
            moodDescription = 'Грустный';
        } else {
            moodState = 'angry';
            moodDescription = 'Расстроенный';
        }
        
        moodText.textContent = moodDescription;
        
        // Выбираем видео в зависимости от состояния
        // Здесь должна быть логика выбора видео на основе текущего и предыдущего состояния
        // Для примера используем простое состояние
        videoElement.src = this.petVideos[moodState];
    }

    updateUI() {
        this.renderTasks();
        this.updateStats();
        this.updatePetVideo();
    }

    showError(message) {
        this.tg.showPopup({
            title: 'Ошибка',
            message: message,
            buttons: [{ type: 'ok' }]
        });
    }

    showSuccess(message) {
        this.tg.showPopup({
            title: 'Успех',
            message: message,
            buttons: [{ type: 'ok' }]
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Инициализация приложения
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new NamiPlanApp();
});
