// Сервис шифрования данных
const crypto = require('crypto');
const logger = require('../config/logger');

// Константы
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits для GCM
const SALT = 'gert_platform_salt_2025'; // Должен быть защищён в будущем
const TAG_LENGTH = 16; // 128-bit auth tag

/**
 * Генерирует ключ шифрования на основе названия компании и masterSecret
 * @param {string} companyName
 * @param {string} masterSecret
 * @returns {Buffer} 32-byte ключ
 */
function generateKey(companyName, masterSecret) {
  if (!companyName || !masterSecret) {
    throw new Error('Company name and master secret are required for key generation');
  }

  const keyMaterial = Buffer.from(companyName.trim() + masterSecret + SALT);
  return crypto.createHash('sha256').update(keyMaterial).digest();
}

/**
 * Шифрует данные с использованием AES-256-GCM
 * @param {string} data - данные для шифрования
 * @param {Buffer} key - 32-byte ключ
 * @returns {string} base64: iv + encrypted + authTag
 */
function encryptData(data, key) {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    const authTag = cipher.getAuthTag();

    // Возвращаем: iv + encrypted + authTag в base64
    return Buffer.from(iv.toString('base64') + '.' + encrypted + '.' + authTag.toString('base64')).toString('base64');
  } catch (err) {
    logger.error('Encryption failed:', err);
    throw new Error('Data encryption failed');
  }
}

/**
 * Расшифровывает данные
 * @param {string} encryptedData - base64 строка: iv.encrypted.authTag
 * @param {Buffer} key - 32-byte ключ
 * @returns {string} расшифрованные данные
 */
function decryptData(encryptedData, key) {
  try {
    const decoded = Buffer.from(encryptedData, 'base64').toString('utf8');
    const [ivB64, encryptedB64, authTagB64] = decoded.split('.');

    if (!ivB64 || !encryptedB64 || !authTagB64) {
      throw new Error('Invalid encrypted data format');
    }

    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedB64, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (err) {
    logger.error('Decryption failed:', err);
    throw new Error('Data decryption failed');
  }
}

module.exports = {
  generateKey,
  encryptData,
  decryptData,
};
