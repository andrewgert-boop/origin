// backend/src/models/Employee.js
// Модель сотрудника, шифрует персональные поля (имя/фамилия/email/phone/position/department).

const db = require('../config/db');
const { encryptField, decryptField } = require('../utils/encryption.service');

async function companyNameById(company_id) {
  const { rows } = await db.query('SELECT name FROM companies WHERE id = $1', [company_id]);
  return rows[0]?.name || 'default_company';
}

class Employee {
  static async create({ company_id, first_name, last_name, email, phone, position, department }) {
    const companyName = await companyNameById(company_id);

    const toEnc = (v) => v ? encryptField(v, companyName) : null;

    const { rows } = await db.query(
      `INSERT INTO employees (company_id, first_name, last_name, email, phone, position, department)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [company_id, toEnc(first_name), toEnc(last_name), toEnc(email), toEnc(phone), toEnc(position), toEnc(department)]
    );
    const e = rows[0];
    return {
      ...e,
      first_name: decryptField(e.first_name, companyName),
      last_name: decryptField(e.last_name, companyName),
      email: decryptField(e.email, companyName),
      phone: decryptField(e.phone, companyName),
      position: decryptField(e.position, companyName),
      department: decryptField(e.department, companyName),
    };
  }

  static async findById(id) {
    const { rows } = await db.query(
      `SELECT e.*, c.name AS company_name FROM employees e
       JOIN companies c ON c.id = e.company_id
       WHERE e.id = $1`, [id]
    );
    const e = rows[0];
    if (!e) return null;
    const cn = e.company_name || 'default_company';
    return {
      ...e,
      first_name: decryptField(e.first_name, cn),
      last_name: decryptField(e.last_name, cn),
      email: decryptField(e.email, cn),
      phone: decryptField(e.phone, cn),
      position: decryptField(e.position, cn),
      department: decryptField(e.department, cn),
    };
  }

  static async listByCompany(company_id, { limit=50, offset=0 } = {}) {
    const { rows } = await db.query(
      `SELECT e.*, c.name AS company_name FROM employees e
       JOIN companies c ON c.id = e.company_id
       WHERE e.company_id = $1
       ORDER BY e.id
       LIMIT $2 OFFSET $3`,
      [company_id, limit, offset]
    );
    const cn = await companyNameById(company_id);
    return rows.map(e => ({
      ...e,
      first_name: decryptField(e.first_name, cn),
      last_name: decryptField(e.last_name, cn),
      email: decryptField(e.email, cn),
      phone: decryptField(e.phone, cn),
      position: decryptField(e.position, cn),
      department: decryptField(e.department, cn),
    }));
  }
}

module.exports = Employee;
