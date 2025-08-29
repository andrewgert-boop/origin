const db = require('../config/db');
const { generateKey, encryptData, decryptData } = require('../utils/encryption.service');
const { MASTER_SECRET } = require('../config/crypto.config');

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
   * Шифруем email и ищем в БД
   */
  static async findByEmail(email) {
    // Получаем все компании
    const companyResult = await db.query('SELECT id, name FROM companies');
    const companies = companyResult.rows;

    for (const company of companies) {
      const key = generateKey(company.name, MASTER_SECRET);
      const encryptedEmail = encryptData(email, key);

      // 🔍 Логируем зашифрованный email для отладки
      console.log('🔍 Searching for encrypted email:', encryptedEmail);

      const result = await db.query('SELECT * FROM users WHERE email = $1', [encryptedEmail]);
      if (result.rows[0]) {
        console.log('✅ User found in DB with company:', company.name);
        return await this.afterFind(result.rows[0], company.name);
      }
    }

    console.log('❌ User not found for email:', email);
    return null;
  }

  static async create(userData) {
    const companyResult = await db.query('SELECT name FROM companies WHERE id = $1', [userData.company_id]);
    if (companyResult.rows.length === 0) {
      throw new Error('Company not found');
    }
    const companyName = companyResult.rows[0].name;
    const key = generateKey(companyName, MASTER_SECRET);

    const encryptedData = { ...userData };

    if (encryptedData.email) {
      encryptedData.email = encryptData(encryptedData.email, key);
    }
    if (encryptedData.phone) {
      encryptedData.phone = encryptData(encryptedData.phone, key);
    }

    const result = await db.query(
      'INSERT INTO users (company_id, email, phone, password_hash, role, status) ' +
      'VALUES ($1, $2, $3, $4, $5, $6) ' +
      'RETURNING *',
      [
        encryptedData.company_id,
        encryptedData.email,
        encryptedData.phone,
        encryptedData.password_hash,
        encryptedData.role,
        encryptedData.status || 'active'
      ]
    );

    return await this.afterFind(result.rows[0], companyName);
  }

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
