// backend/src/utils/encryption.service.js
// Динамическое шифрование AES-256-GCM с IV и тегом аутентификации.
// Ключ генерируется на основе MASTER_SECRET + названия компании (или статического соли по компании).

const crypto = require('crypto');
const MASTER = process.env.MASTER_SECRET || 'change_me_master_secret';

// Генерация детерминированного ключа 32 байта из master + companyName (+ salt)
function generateKey(companyName, salt='') {
  const hash = crypto.createHash('sha256');
  hash.update(String(companyName || 'default_company'));
  hash.update(String(MASTER));
  hash.update(String(salt || 'static_salt'));
  return hash.digest().subarray(0, 32); // 256 бит
}

// Шифрует произвольный JSON-значение (строку, объект, число)
function encryptData(value, key) {
  const iv = crypto.randomBytes(12); // GCM = 96 бит IV
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plain = Buffer.from(JSON.stringify(value), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    cipher: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

// Расшифровывает JSON-значение
function decryptData(pack, key) {
  if (!pack || !pack.cipher) return null;
  const iv = Buffer.from(pack.iv, 'base64');
  const tag = Buffer.from(pack.tag, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const enc = Buffer.from(pack.cipher, 'base64');
  const plain = Buffer.concat([decipher.update(enc), decipher.final()]);
  return JSON.parse(plain.toString('utf8'));
}

// Вспомогательные обёртки для полей: шифруем объектом {cipher,iv,tag}
function encryptField(obj, companyName, salt='') {
  const key = generateKey(companyName, salt);
  return encryptData(obj, key);
}
function decryptField(pack, companyName, salt='') {
  const key = generateKey(companyName, salt);
  return decryptData(pack, key);
}

module.exports = { generateKey, encryptData, decryptData, encryptField, decryptField };
