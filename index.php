<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>NamiPlan</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!-- Telegram WebApp API -->
    <script src="https://telegram.org/js/telegram-web-app.js"></script>

    <link rel="stylesheet" href="style.css">
</head>
<body>

<div class="app">

    <!-- ПИТОМЕЦ -->
    <div class="pet-box">
        <video id="petVideo" autoplay muted playsinline></video>
        <div class="mood-label" id="moodLabel">🙂 Спокойный</div>
    </div>

    <!-- СТАТЫ -->
    <div class="stats">
        <div>❤️ Настроение: <span id="moodValue">50</span></div>
        <div>🍗 Сытость: <span id="foodValue">50</span></div>
        <div>💤 Энергия: <span id="energyValue">50</span></div>
    </div>

    <!-- ДЕЙСТВИЯ -->
    <div class="actions">
        <button onclick="feed()">🍎 Кормить</button>
        <button onclick="sleep()">💤 Спать</button>
        <button onclick="openShop()">🛒 Магазин</button>
        <button onclick="decorate()">🛋 Комната</button>
    </div>

    <!-- ПЛАНЕР -->
    <div class="planner">
        <h3>📋 Задания</h3>

        <div class="task-add">
            <input id="taskInput" placeholder="Новая задача..." />
            <button onclick="addTask()">➕</button>
        </div>

        <ul id="taskList"></ul>
    </div>

</div>

<script src="app.js"></script>
</body>
</html>
