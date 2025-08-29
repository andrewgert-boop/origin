const db = require('../config/db');
const { generateKey, encryptData, decryptData } = require('../utils/encryption.service');
const { MASTER_SECRET } = require('../config/crypto.config');
const crypto = require('crypto');

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

  static async findByEmail(email) {
    const emailHash = hashEmail(email);
    console.log('🔍 findByEmail: looking for email_hash =', emailHash);

    const result = await db.query('SELECT * FROM users WHERE email_hash = $1', [emailHash]);
    if (!result.rows[0]) {
      console.log('❌ User not found by email_hash');
      return null;
    }

    const user = result.rows[0];
    console.log('✅ User found in DB:', user.id);

    const companyResult = await db.query('SELECT name FROM companies WHERE id = $1', [user.company_id]);
    if (companyResult.rows.length === 0) {
      throw new Error('Company not found');
    }
    const companyName = companyResult.rows[0].name;

    return await this.afterFind(user, companyName);
  }

  static async create(userData) {
    console.log('🔐 User.create called with:', { email: userData.email, role: userData.role });

    const companyResult = await db.query('SELECT name FROM companies WHERE id = $1', [userData.company_id]);
    if (companyResult.rows.length === 0) {
      throw new Error('Company not found');
    }
    const companyName = companyResult.rows[0].name;
    const key = generateKey(companyName, MASTER_SECRET);

    const encryptedData = { ...userData };
    const emailHash = hashEmail(userData.email);

    console.log('🔐 emailHash generated:', emailHash);

    if (encryptedData.email) {
      encryptedData.email = encryptData(encryptedData.email, key);
    }
    if (encryptedData.phone) {
      encryptedData.phone = encryptData(encryptedData.phone, key);
    }

    console.log('🔐 Encrypted email:', encryptedData.email);

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

    console.log('✅ User inserted into DB with id:', result.rows[0].id);

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
