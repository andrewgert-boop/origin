// backend/src/models/User.js
// Модель пользователя с шифрованием email/phone через AES-256-GCM.
// В базе поля email/phone хранятся как JSONB: { cipher, iv, tag }.

const db = require('../config/db');
const { encryptField, decryptField } = require('../utils/encryption.service');

class User {
  static async create({ company_id, email, phone, password_hash, role='user', status='active' }) {
    // Получаем имя компании для генерации ключа
    const { rows: crows } = await db.query('SELECT name FROM companies WHERE id = $1', [company_id]);
    const companyName = crows[0]?.name || 'default_company';

    const emailEnc = email ? encryptField(email, companyName) : null;
    const phoneEnc = phone ? encryptField(phone, companyName) : null;

    const { rows } = await db.query(
      `INSERT INTO users (company_id, email, phone, password_hash, role, status)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, company_id, email, phone, role, status, created_at`,
      [company_id, emailEnc, phoneEnc, password_hash, role, status]
    );

    const u = rows[0];
    // Дешифруем для отдачи наружу
    return {
      ...u,
      email: decryptField(u.email, companyName),
      phone: decryptField(u.phone, companyName),
    };
  }

  static async findById(id) {
    const { rows } = await db.query(
      `SELECT u.*, c.name AS company_name
       FROM users u LEFT JOIN companies c ON c.id = u.company_id
       WHERE u.id = $1`, [id]
    );
    const u = rows[0];
    if (!u) return null;
    return {
      ...u,
      email: decryptField(u.email, u.company_name || 'default_company'),
      phone: decryptField(u.phone, u.company_name || 'default_company'),
    };
  }

  static async update(id, payload) {
    // Считываем компанию
    const { rows: r } = await db.query(
      `SELECT u.id, u.company_id, c.name AS company_name
       FROM users u LEFT JOIN companies c ON c.id = u.company_id WHERE u.id = $1`, [id]
    );
    if (!r[0]) return null;
    const companyName = r[0].company_name || 'default_company';

    const fields = [];
    const values = [];
    let idx = 1;

    if (payload.email !== undefined) {
      fields.push(`email = $${idx++}`);
      values.push(payload.email ? encryptField(payload.email, companyName) : null);
    }
    if (payload.phone !== undefined) {
      fields.push(`phone = $${idx++}`);
      values.push(payload.phone ? encryptField(payload.phone, companyName) : null);
    }
    if (payload.password_hash !== undefined) {
      fields.push(`password_hash = $${idx++}`);
      values.push(payload.password_hash);
    }
    if (payload.role !== undefined) {
      fields.push(`role = $${idx++}`);
      values.push(payload.role);
    }
    if (payload.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(payload.status);
    }

    if (!fields.length) return await this.findById(id);

    values.push(id);
    const { rows } = await db.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values
    );
    const u = rows[0];
    return {
      ...u,
      email: decryptField(u.email, companyName),
      phone: decryptField(u.phone, companyName),
    };
  }
}

module.exports = User;
