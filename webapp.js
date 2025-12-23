const tg = window.Telegram.WebApp;

tg.ready();

// данные пользователя
if (tg.initDataUnsafe.user) {
    const user = tg.initDataUnsafe.user;
    document.getElementById("user").innerText =
        "👤 " + user.first_name + " (@" + user.username + ")";
} else {
    document.getElementById("user").innerText =
        "❌ Пользователь не найден";
}

// отправка данных в бота
function sendData() {
    tg.sendData(JSON.stringify({
        action: "hello",
        time: Date.now()
    }));

    tg.close();
}
