/**
 * Экспорт middleware для аутентификации
 * 
 * ВАЖНО: Исправлена проблема с пустым файлом и неправильными импортами.
 * Теперь auth.js экспортирует authenticateToken и checkRole из соответствующих файлов.
 */

const authenticateToken = require('./authenticateToken');
const checkRole = require('./checkRole');

module.exports = {
  authenticateToken,
  checkRole
};
