<?php

// ======================================
// НАСТРОЙКИ
// ======================================
$TOKEN = getenv("BOT_TOKEN");
$API_URL = "https://api.telegram.org/bot" . $TOKEN . "/";

// ======================================
// ЛОГ (для Render, можно оставить)
// ======================================
file_put_contents(
    "log.txt",
    date("Y-m-d H:i:s") . " | webhook hit\n",
    FILE_APPEND
);

// ======================================
// ПОЛУЧАЕМ UPDATE
// ======================================
$raw = file_get_contents("php://input");
$update = json_decode($raw, true);

if (!$update) {
    http_response_code(200);
    exit;
}

// ======================================
// 1. ПРИЁМ ДАННЫХ ИЗ WEB APP
// ======================================
if (isset($update["message"]["web_app_data"])) {

    $chat_id = $update["message"]["chat"]["id"];
    $data = $update["message"]["web_app_data"]["data"];

    sendMessage(
        $chat_id,
        "📦 Данные из приложения получены:\n\n" . $data
    );

    http_response_code(200);
    exit;
}

// ======================================
// 2. ОБРАБОТКА СООБЩЕНИЙ
// ======================================
if (isset($update["message"])) {

    $chat_id = $update["message"]["chat"]["id"];
    $text = $update["message"]["text"] ?? "";

    // ---------- /start ----------
    if ($text === "/start") {

        sendMessage(
            $chat_id,
            "👋 Добро пожаловать в NamiPlan.\n\n" .
            "Открой приложение через кнопку в интерфейсе Telegram ⬆️"
        );
    }

    // ---------- любые другие сообщения ----------
    else {
        sendMessage(
            $chat_id,
            "ℹ️ Используй кнопку приложения в интерфейсе Telegram для работы с NamiPlan."
        );
    }
}

// ======================================
// ФУНКЦИЯ ОТПРАВКИ СООБЩЕНИЙ
// ======================================
function sendMessage($chat_id, $text)
{
    global $API_URL;

    $data = [
        "chat_id" => $chat_id,
        "text" => $text,
        "parse_mode" => "HTML"
    ];

    file_get_contents(
        $API_URL . "sendMessage?" . http_build_query($data)
    );
}

http_response_code(200);
