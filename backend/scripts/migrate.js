// backend/scripts/migrate.js
// Простой раннер миграций: выполняет все .sql из backend/migrations по алфавиту.

const fs = require('fs');
const path = require('path');
const db = require('../src/config/db');

(async () => {
  try {
    const dir = path.join(__dirname, '..', 'migrations');
    const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
    console.log(`🧩 Найдено миграций: ${files.length}`);
    for (const f of files) {
      const full = path.join(dir, f);
      const sql = fs.readFileSync(full, 'utf8');
      console.log(`➡️  Выполняем: ${f}`);
      await db.query(sql);
      console.log(`✅ Готово: ${f}`);
    }
    console.log('🎉 Миграции успешно выполнены');
    process.exit(0);
  } catch (e) {
    console.error('❌ Ошибка миграций:', e);
    process.exit(1);
  }
})();
