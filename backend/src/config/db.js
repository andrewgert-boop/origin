const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL_DISABLE ? false : { rejectUnauthorized: false },
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
