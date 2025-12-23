const tg = window.Telegram.WebApp;
tg.ready();

// ===================
// СОСТОЯНИЕ
// ===================
let state = {
    mood: 50,
    food: 50,
    energy: 50,
    moodState: "calm",
    tasks: []
};

// ===================
// ВИДЕО
// ===================
const videos = {
    angry_to_calm: "videos/angry_to_calm.mp4",
    calm_to_angry: "videos/calm_to_angry.mp4",
    calm_to_happy: "videos/calm_to_happy.mp4",
    happy_to_calm: "videos/happy_to_calm.mp4"
};

const video = document.getElementById("petVideo");

function playVideo(src) {
    video.src = src;
    video.play();
}

// старт
playVideo(videos.angry_to_calm);

// ===================
// ОБНОВЛЕНИЕ UI
// ===================
function updateUI() {
    document.getElementById("moodValue").innerText = state.mood;
    document.getElementById("foodValue").innerText = state.food;
    document.getElementById("energyValue").innerText = state.energy;

    document.getElementById("moodLabel").innerText =
        state.moodState === "angry" ? "😡 Злой" :
        state.moodState === "happy" ? "😁 Радостный" :
        "🙂 Спокойный";
}

// ===================
// ДЕЙСТВИЯ
// ===================
function feed() {
    state.food = Math.min(100, state.food + 20);
    if (state.moodState === "angry") {
        state.moodState = "calm";
        playVideo(videos.angry_to_calm);
    }
    updateUI();
}

function sleep() {
    state.energy = 100;
    if (state.moodState === "happy") {
        state.moodState = "calm";
        playVideo(videos.happy_to_calm);
    }
    updateUI();
}

function openShop() {
    alert("🛒 Магазин еды (будет позже)");
}

function decorate() {
    alert("🛋 Комната питомца (будет позже)");
}

// ===================
// ПЛАНЕР
// ===================
function addTask() {
    const input = document.getElementById("taskInput");
    if (!input.value) return;

    state.tasks.push({
        text: input.value,
        done: false
    });

    input.value = "";
    renderTasks();
}

function renderTasks() {
    const list = document.getElementById("taskList");
    list.innerHTML = "";

    state.tasks.forEach((task, i) => {
        const li = document.createElement("li");
        li.innerHTML = `
            <span>${task.text}</span>
            <button onclick="completeTask(${i})">✅</button>
        `;
        list.appendChild(li);
    });
}

function completeTask(i) {
    state.tasks[i].done = true;
    state.mood = Math.min(100, state.mood + 10);

    if (state.moodState === "calm") {
        state.moodState = "happy";
        playVideo(videos.calm_to_happy);
    }

    renderTasks();
    updateUI();
}

// ===================
// НАКАЗАНИЕ ЗА ЛЕНЬ
// ===================
setInterval(() => {
    state.mood -= 5;
    if (state.mood < 30 && state.moodState === "calm") {
        state.moodState = "angry";
        playVideo(videos.calm_to_angry);
    }
    updateUI();
}, 60000);
