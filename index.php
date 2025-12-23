<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>NamiPlan WebApp</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <!-- Telegram WebApp API -->
    <script src="https://telegram.org/js/telegram-web-app.js"></script>

    <style>
        body {
            margin: 0;
            padding: 20px;
            background: #0f172a;
            color: #fff;
            font-family: Arial, sans-serif;
        }

        h1 {
            margin-top: 0;
        }

        .card {
            background: #020617;
            border-radius: 16px;
            padding: 20px;
        }

        button {
            margin-top: 20px;
            width: 100%;
            padding: 14px;
            border: none;
            border-radius: 12px;
            background: #22c55e;
            color: #000;
            font-size: 16px;
            font-weight: bold;
        }
    </style>
</head>
<body>

<h1>🚀 NamiPlan</h1>

<div class="card">
    <p id="user">Загрузка данных пользователя...</p>

    <button onclick="sendData()">Отправить данные боту</button>
</div>

<script src="webapp.js"></script>
</body>
</html>
