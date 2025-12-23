<?php

// ======================================
// НАСТРОЙКИ
// ======================================
$TOKEN = getenv("BOT_TOKEN");
$API_URL = "https://api.telegram.org/bot" . $TOKEN . "/";

// ======================================
// ЛОГ (для Render)
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
// 1. ДАННЫЕ ИЗ WEB APP
// ======================================
if (isset($update["message"]["web_app_data"])) {

    $chat_id = $update["message"]["chat"]["id"];
    $data = $update["message"]["web_app_data"]["data"];

    sendMessage(
        $chat_id,
        "📦 Получены данные из приложения:\n" . $data
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

        // 🔥 КНОПКА В КЛАВИАТУРЕ
        $keyboard = [
            "keyboard" => [
                [
                    [
                        "text" => "🚀 Открыть NamiPlan",
                        "web_app" => [
                            "url" => "https://namiplan.onrender.com/"
                        ]
                    ]
                ]
            ],
            "resize_keyboard" => true,
            "is_persistent" => true
        ];

        sendMessage(
            $chat_id,
            "Добро пожаловать в NamiPlan 👋\n\nКнопка приложения теперь внизу 👇",
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
// ФУНКЦИЯ ОТПРАВКИ
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
