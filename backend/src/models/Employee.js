// Модель сотрудника
const db = require('../config/db');

class Employee {
  constructor(data) {
    this.id = data.id;
    this.company_id = data.company_id;
    this.first_name = data.first_name;
    this.last_name = data.last_name;
    this.email = data.email;
    this.position = data.position;
    this.department = data.department;
    this.created_at = data.created_at;
  }

  // Получить всех сотрудников компании
  static async findAllByCompany(companyId, { limit = 10, offset = 0, search, sortBy = 'last_name', sortOrder = 'ASC' }) {
    let query = 'SELECT * FROM employees WHERE company_id = $1';
    const params = [companyId];
    let paramCount = 2;

    if (search) {
      query += ` AND (first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY "${sortBy}" ${sortOrder}`;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  // Получить количество сотрудников (для пагинации)
  static async countByCompany(companyId, { search }) {
    let query = 'SELECT COUNT(*) FROM employees WHERE company_id = $1';
    const params = [companyId];
    let paramCount = 2;

    if (search) {
      query += ` AND (first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount} OR email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    const result = await db.query(query, params);
    return parseInt(result.rows[0].count);
  }

  // Получить сотрудника по ID и company_id
  static async findByIdAndCompany(id, companyId) {
    const result = await db.query('SELECT * FROM employees WHERE id = $1 AND company_id = $2', [id, companyId]);
    return result.rows[0];
  }

  // Создать сотрудника
  static async create(data) {
    const result = await db.query(
      `INSERT INTO employees (company_id, first_name, last_name, email, position, department)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [data.company_id, data.first_name, data.last_name, data.email, data.position, data.department]
    );
    return new Employee(result.rows[0]);
  }

  // Обновить сотрудника
  static async update(id, companyId, data) {
    const result = await db.query(
      `UPDATE employees
       SET first_name = $1, last_name = $2, email = $3, position = $4, department = $5
       WHERE id = $6 AND company_id = $7
       RETURNING *`,
      [data.first_name, data.last_name, data.email, data.position, data.department, id, companyId]
    );
    return result.rows[0];
  }

  // Удалить сотрудника
  static async delete(id, companyId) {
    await db.query('DELETE FROM employees WHERE id = $1 AND company_id = $2', [id, companyId]);
  }
}

module.exports = Employee;
