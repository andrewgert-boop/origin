const { Pool } = require('pg');

// Проверка наличия DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('❌ ОШИБКА: DATABASE_URL не установлена в переменных окружения');
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL_DISABLE
    ? false
    : process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
});

// Логируем успешное подключение
pool.on('connect', () => {
  console.log('✅ Подключено к PostgreSQL: gert_platform');
});

// Логируем ошибки подключения
pool.on('error', (err) => {
  console.error('❌ Ошибка подключения к PostgreSQL:', err);
});

// Экспортируем метод query для использования в моделях
module.exports = {
  query: (text, params) => pool.query(text, params),
};