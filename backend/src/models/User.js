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
    this.first_name = data.first_name || null;
    this.last_name = data.last_name || null;
    this.middle_name = data.middle_name || null;
    this.email = data.email;
    this.phone = data.phone || null;
    this.role = data.role;
    this.status = data.status;
    this.created_at = data.created_at;
    this.password_hash = data.password_hash;
  }

  static async findByEmail(email) {
    const emailHash = hashEmail(email);

    const result = await db.query('SELECT * FROM users WHERE email_hash = $1', [emailHash]);
    if (!result.rows[0]) {
      return null;
    }

    const user = result.rows[0];

    const companyResult = await db.query('SELECT name FROM companies WHERE id = $1', [user.company_id]);
    if (companyResult.rows.length === 0) {
      throw new Error('Company not found');
    }
    const companyName = companyResult.rows[0].name;

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

    const fieldsToEncrypt = ['first_name', 'last_name', 'middle_name', 'email', 'phone'];
    for (const field of fieldsToEncrypt) {
      if (encryptedData[field]) {
        try {
          encryptedData[field] = encryptData(encryptedData[field], key);
        } catch (err) {
          console.error('Encryption failed for User.' + field + ':', err.message);
          throw new Error('Failed to encrypt user data');
        }
      }
    }

    const result = await db.query(
      'INSERT INTO users (company_id, first_name, last_name, middle_name, email, phone, password_hash, role, status, email_hash) ' +
      'VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ' +
      'RETURNING *',
      [
        encryptedData.company_id,
        encryptedData.first_name,
        encryptedData.last_name,
        encryptedData.middle_name,
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

  static async afterFind(data, companyName) {
    if (!data) return null;

    const key = generateKey(companyName, MASTER_SECRET);
    const result = { ...data };

    const fieldsToDecrypt = ['first_name', 'last_name', 'middle_name', 'email', 'phone'];
    for (const field of fieldsToDecrypt) {
      if (result[field]) {
        try {
          result[field] = decryptData(result[field], key);
        } catch (err) {
          console.error('Decryption error for User.' + field + ':', err.message);
          result[field + '_decrypted'] = false;
          result[field] = '[decryption error]';
        }
      }
    }

    return new User(result);
  }
}

module.exports = User;
