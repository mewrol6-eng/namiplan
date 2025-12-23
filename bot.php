<?php

// ===============================
// ЛОГ ДЛЯ ПРОВЕРКИ
// ===============================
file_put_contents("ping.txt", "hit ".date("Y-m-d H:i:s")."\n", FILE_APPEND);

// ===============================
// TOKEN БЕРЁМ ИЗ ENV (Render)
// ===============================
$TOKEN = getenv("BOT_TOKEN");
$API_URL = "https://api.telegram.org/bot".$TOKEN."/";

// ===============================
$raw = file_get_contents("php://input");
$update = json_decode($raw, true);

// ===============================
if (isset($update["message"])) {
    $chat_id = $update["message"]["chat"]["id"];
    $text = $update["message"]["text"] ?? "";

    sendMessage($chat_id, "✅ Бот работает\nТы написал: ".$text);
}

// ===============================
function sendMessage($chat_id, $text) {
    global $API_URL;

    $url = $API_URL."sendMessage";

    $data = [
        "chat_id" => $chat_id,
        "text" => $text
    ];

    file_get_contents($url."?".http_build_query($data));
}

http_response_code(200);
