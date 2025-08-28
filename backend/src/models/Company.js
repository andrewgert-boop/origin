// Модель компании
const db = require('../config/db');

class Company {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.contact_email = data.contact_email;
    this.status = data.status;
    this.created_at = data.created_at;
  }

  // Получить все компании (с пагинацией, фильтрацией, сортировкой)
  static async findAll({ limit = 10, offset = 0, search, sortBy = 'name', sortOrder = 'ASC' }) {
    let query = 'SELECT * FROM companies WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (name ILIKE $${paramCount} OR contact_email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += ` ORDER BY "${sortBy}" ${sortOrder}`;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  // Получить количество компаний (для пагинации)
  static async countAll({ search }) {
    let query = 'SELECT COUNT(*) FROM companies WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (search) {
      query += ` AND (name ILIKE $${paramCount} OR contact_email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    const result = await db.query(query, params);
    return parseInt(result.rows[0].count);
  }

  // Получить компанию по ID
  static async findById(id) {
    const result = await db.query('SELECT * FROM companies WHERE id = $1', [id]);
    return result.rows[0];
  }

  // Создать компанию
  static async create(data) {
    const result = await db.query(
      `INSERT INTO companies (name, contact_email, status)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.name, data.contact_email, data.status || 'active']
    );
    return new Company(result.rows[0]);
  }

  // Обновить компанию
  static async update(id, data) {
    const result = await db.query(
      `UPDATE companies
       SET name = $1, contact_email = $2, status = $3
       WHERE id = $4
       RETURNING *`,
      [data.name, data.contact_email, data.status, id]
    );
    return result.rows[0];
  }

  // Удалить компанию
  static async delete(id) {
    await db.query('DELETE FROM companies WHERE id = $1', [id]);
  }
}

module.exports = Company;
