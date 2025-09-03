// backend/src/config/logger.js
// Простой winston-логгер: пишет в консоль и файл (если доступен).
const { createLogger, format, transports } = require('winston');
const path = require('path');

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.printf(({ level, message, timestamp, stack }) =>
      `${timestamp} [${level}] ${stack || message}`
    )
  ),
  transports: [
    new transports.Console(),
    // Файловый транспорт не критичен: если нет прав, winston сам упадёт — оборачиваем созданием позже при старте, но для простоты оставим.
  ],
});

// Попытка добавить файл — не критично при ошибке
try {
  const file = new transports.File({ filename: path.join('/app/logs', 'app.log') });
  logger.add(file);
} catch (e) {
  // игнор
}

module.exports = logger;
