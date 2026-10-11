module.exports = (bot, options) => {
    const log = bot.sendLog;
    const settings = options.settings || {};

    // 1 - Креатив, 0 - Выживание, 3 - Наблюдатель, 2 - Приключения
    const targetGamemode = settings.targetGamemode ?? '1';
    const delayMs = typeof settings.delayMs === 'number' ? settings.delayMs : 1000;

    // Паттерны серверных сообщений:
    // 1) › Игрок UPU022 сменил вам игровой режим
    // 2) › Установлен режим игры <режим> для игрока <ник>
    const changeByPlayerRegex = /^(?:›|\|)\s*Игрок\s+([a-zA-Z0-9_]+)\s+сменил вам игровой режим/i;
    const modeSetRegex = /^(?:›|\|)\s*Установлен режим игры\s+(\S+)\s+для игрока\s+([a-zA-Z0-9_]+)/i;

    let cooldown = false;

    const enforceGamemode = (reason) => {
        if (cooldown) return;
        cooldown = true;

        log(`[AutoGamemode] Обнаружена смена режима (${reason}). Возвращаю режим: ${targetGamemode}`);

        setTimeout(() => {
            // Отправляем команду смены режима боту
            bot.api.sendMessage('command', `/gm ${targetGamemode}`);

            // Небольшая задержка перед снятием лока, чтобы не спамить при двойных пакетах чата
            setTimeout(() => {
                cooldown = false;
            }, 1500);
        }, delayMs);
    };

    const messageHandler = (rawMessageText) => {
        if (!rawMessageText) return;
        const cleanMessage = rawMessageText.trim();

        // Проверка 1: "Игрок ... сменил вам игровой режим"
        if (changeByPlayerRegex.test(cleanMessage)) {
            enforceGamemode('Смена другим игроком');
            return;
        }

        // Проверка 2: "Установлен режим игры ... для игрока <ник_бота>"
        const match = cleanMessage.match(modeSetRegex);
        if (match) {
            const targetNick = match[2];
            // Проверяем, что сообщение адресовано именно этому боту
            if (targetNick.toLowerCase() === bot.username.toLowerCase()) {
                enforceGamemode('Системное уведомление сервера');
            }
        }
    };

    // Слушаем сырые сообщения чата (до парсинга)
    bot.events.on('core:raw_message', messageHandler);

    // Удаляем слушатель при выгрузке/отключении бота
    bot.once('end', () => {
        bot.events.removeListener('core:raw_message', messageHandler);
        log('[AutoGamemode] Плагин выгружен.');
    });

    log(`[AutoGamemode] Плагин активирован. Целевой режим: ${targetGamemode}`);
};