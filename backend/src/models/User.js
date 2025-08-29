const db = require('../config/db');
const { generateKey, encryptData, decryptData } = require('../utils/encryption.service');
const { MASTER_SECRET } = require('../config/crypto.config');
const crypto = require('crypto');

// Утилита для хеширования email (для поиска)
function hashEmail(email) {
  return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex');
}

class User {
  constructor(data) {
    this.id = data.id;
    this.company_id = data.company_id;
    this.email = data.email;
    this.phone = data.phone || null;
    this.role = data.role;
    this.status = data.status;
    this.created_at = data.created_at;
    this.password_hash = data.password_hash;
  }

  /**
   * Найти пользователя по email
   * Ищем по email_hash, расшифровываем email
   */
  static async findByEmail(email) {
    const emailHash = hashEmail(email);

    const result = await db.query('SELECT * FROM users WHERE email_hash = $1', [emailHash]);
    if (!result.rows[0]) {
      console.log('❌ User not found by email_hash:', emailHash);
      return null;
    }

    const user = result.rows[0];

    // Получаем название компании
    const companyResult = await db.query('SELECT name FROM companies WHERE id = $1', [user.company_id]);
    if (companyResult.rows.length === 0) {
      throw new Error('Company not found');
    }
    const companyName = companyResult.rows[0].name;

    // Расшифровываем только публичные поля
    return await this.afterFind(user, companyName);
  }

  static async create(userData) {
    const companyResult = await db.query('SELECT name FROM companies WHERE id = $1', [userData.company_id]);
    if (companyResult.rows.length === 0) {
      throw new Error('Company not found');
    }
    const companyName = companyResult.rows[0].name;
    const key = generateKey(companyName, MASTER_SECRET);

    const encryptedData = { ...userData };
    const emailHash = hashEmail(userData.email);

    if (encryptedData.email) {
      encryptedData.email = encryptData(encryptedData.email, key);
    }
    if (encryptedData.phone) {
      encryptedData.phone = encryptData(encryptedData.phone, key);
    }

    const result = await db.query(
      'INSERT INTO users (company_id, email, phone, password_hash, role, status, email_hash) ' +
      'VALUES ($1, $2, $3, $4, $5, $6, $7) ' +
      'RETURNING *',
      [
        encryptedData.company_id,
        encryptedData.email,
        encryptedData.phone,
        encryptedData.password_hash,
        encryptedData.role,
        encryptedData.status || 'active',
        emailHash
      ]
    );

    return await this.afterFind(result.rows[0], companyName);
  }

  /**
   * Расшифровка данных после чтения из БД
   */
  static async afterFind(data, companyName) {
    if (!data) return null;

    const key = generateKey(companyName, MASTER_SECRET);
    const result = { ...data };

    try {
      if (result.email) {
        result.email = decryptData(result.email, key);
      }
      if (result.phone) {
        result.phone = decryptData(result.phone, key);
      }
    } catch (err) {
      console.error('Decryption error for User:', err.message);
    }

    return new User(result);
  }
}

module.exports = User;
