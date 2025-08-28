const db = require('../config/db');
const { generateKey, encryptData, decryptData } = require('../utils/encryption.service');
const { MASTER_SECRET } = require('../config/crypto.config');

class User {
  constructor(data) {
    this.id = data.id;
    this.company_id = data.company_id;
    this.email = data.email;
    this.phone = data.phone;
    this.role = data.role;
    this.status = data.status;
    this.created_at = data.created_at;
  }

  // Автоматическое шифрование перед сохранением
  static async beforeSave(data, companyName) {
    const key = generateKey(companyName, MASTER_SECRET);

    if (data.email) {
      data.email = encryptData(data.email, key);
    }
    if (data.phone) {
      data.phone = encryptData(data.phone, key);
    }

    return data;
  }

  // Автоматическая расшифровка после чтения
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
      // Не падаем, возвращаем зашифрованные данные с флагом
      result.decryptionError = true;
    }

    return new User(result);
  }

  static async findById(id, companyName) {
    const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
    const user = result.rows[0];
    return await this.afterFind(user, companyName);
  }

  static async create(userData, companyName) {
    const encryptedData = await this.beforeSave(userData, companyName);
    const result = await db.query(
      `INSERT INTO users (company_id, email, phone, role, status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, company_id, email, phone, role, status, created_at`,
      [encryptedData.company_id, encryptedData.email, encryptedData.phone, encryptedData.role, encryptedData.status]
    );
    return await this.afterFind(result.rows[0], companyName);
  }

  static async update(id, data, companyName) {
    const encryptedData = await this.beforeSave(data, companyName);
    const result = await db.query(
      `UPDATE users
       SET email = $1, phone = $2, role = $3, status = $4
       WHERE id = $5
       RETURNING id, company_id, email, phone, role, status, created_at`,
      [encryptedData.email, encryptedData.phone, encryptedData.role, encryptedData.status, id]
    );
    return await this.afterFind(result.rows[0], companyName);
  }
}

module.exports = User;
