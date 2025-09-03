// backend/src/config/db.js
// Безопасный пул PG: не коннектимся на импорт, без фатального падения при недоступной БД.
// Подключаемся только при первом query(). SSL отключаем, если DB_SSL_DISABLE=1.

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || 'postgres://gert_user:gert_password@postgres:5432/gert_platform';

const ssl =
  process.env.DB_SSL_DISABLE === '1'
    ? false
    : { rejectUnauthorized: false };

const pool = new Pool({
  connectionString,
  ssl,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// НЕ делаем тестовый connect() на импорт — пусть первый query() инициирует подключение.

pool.on('error', (err) => {
  // Логируем, но не валим процесс
  console.error('PG pool error:', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
