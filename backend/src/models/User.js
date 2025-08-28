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
  }

  static async findByEmail(email) {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] ? new User(result.rows[0]) : null;
  }

  static async create(userData) {
    // Получаем название компании
    const companyResult = await db.query('SELECT name FROM companies WHERE id = $1', [userData.company_id]);
    if (companyResult.rows.length === 0) {
      throw new Error('Company not found');
    }
    const companyName = companyResult.rows[0].name;

    // Шифруем данные
    const key = generateKey(companyName, MASTER_SECRET);
    const encryptedData = { ...userData };

    if (encryptedData.email) {
      encryptedData.email = encryptData(encryptedData.email, key);
    }
    if (encryptedData.phone) {
      encryptedData.phone = encryptData(encryptedData.phone, key);
    }

    // Сохраняем
    const result = await db.query(
      'INSERT INTO users (company_id, email, phone, role, status) ' +
      'VALUES ($1, $2, $3, $4, $5) ' +
      'RETURNING *',
      [encryptedData.company_id, encryptedData.email, encryptedData.phone, encryptedData.role, encryptedData.status]
    );

    // Расшифровываем перед возвратом
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
      result.decryptionError = true;
    }

    return new User(result);
  }
}

module.exports = User;