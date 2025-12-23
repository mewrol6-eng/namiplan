<?php

// ======================================
// НАСТРОЙКИ
// ======================================
$TOKEN = getenv("BOT_TOKEN");
$API_URL = "https://api.telegram.org/bot" . $TOKEN . "/";

// ======================================
// БАЗОВЫЙ ЛОГ (для отладки на Render)
// ======================================
file_put_contents(
    "log.txt",
    date("Y-m-d H:i:s") . " | webhook hit\n",
    FILE_APPEND
);

// ======================================
// ПОЛУЧАЕМ UPDATE ОТ TELEGRAM
// ======================================
$raw = file_get_contents("php://input");
file_put_contents("log.txt", "RAW: " . $raw . "\n", FILE_APPEND);

$update = json_decode($raw, true);

if (!$update) {
    http_response_code(200);
    exit;
}

// ======================================
// 1. ОБРАБОТКА WEB APP DATA
// ======================================
if (isset($update["message"]["web_app_data"])) {

    $chat_id = $update["message"]["chat"]["id"];
    $data = $update["message"]["web_app_data"]["data"];

    sendMessage(
        $chat_id,
        "📦 Данные из Web App получены:\n\n" . $data
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

        $keyboard = [
            "inline_keyboard" => [
                [
                    [
                        "text" => "🚀 Открыть NamiPlan",
                        "web_app" => [
                            "url" => "https://namiplan.onrender.com/"
                        ]
                    ]
                ]
            ]
        ];

        sendMessage(
            $chat_id,
            "Добро пожаловать в NamiPlan 👋\n\nНажми кнопку ниже, чтобы открыть приложение.",
            $keyboard
        );
    }

    // ---------- любое другое сообщение ----------
    else {
        sendMessage(
            $chat_id,
            "Ты написал:\n" . $text
        );
    }
}

// ======================================
// ФУНКЦИЯ ОТПРАВКИ СООБЩЕНИЙ
// ======================================
function sendMessage($chat_id, $text, $keyboard = null)
{
    global $API_URL;

    $data = [
        "chat_id" => $chat_id,
        "text" => $text,
        "parse_mode" => "HTML"
    ];

    if ($keyboard !== null) {
        $data["reply_markup"] = json_encode($keyboard);
    }

    file_get_contents(
        $API_URL . "sendMessage?" . http_build_query($data)
    );
}

http_response_code(200);
