// Конфигурация криптографии
const logger = require('./logger');

// Master Secret должен быть в .env
const MASTER_SECRET = process.env.MASTER_SECRET;

if (!MASTER_SECRET) {
  logger.error('❌ ОШИБКА: MASTER_SECRET не установлен в переменных окружения. Безопасность системы нарушена.');
  process.exit(1);
}

// Проверка длины (рекомендуется > 32 символа)
if (MASTER_SECRET.length < 32) {
  logger.warn('⚠️  MASTER_SECRET короткий. Рекомендуется использовать строку из 32+ символов.');
}

module.exports = {
  MASTER_SECRET,
  SALT: 'gert_platform_salt_2025', // В будущем можно хранить в секрете
};
