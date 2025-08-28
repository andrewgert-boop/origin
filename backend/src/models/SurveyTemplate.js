// Модель шаблона опроса
const db = require('../config/db');

class SurveyTemplate {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.is_active = data.is_active;
    this.version = data.version;
    this.created_at = data.created_at;
  }

  // Получить все шаблоны (с фильтрацией по активности)
  static async findAll({ limit = 10, offset = 0, search, isActive, sortBy = 'name', sortOrder = 'ASC' }) {
    let query = 'SELECT * FROM survey_templates WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (search) {
      query += ` AND name ILIKE $${paramCount}`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (isActive !== undefined) {
      query += ` AND is_active = $${paramCount}`;
      params.push(isActive);
      paramCount++;
    }

    query += ` ORDER BY "${sortBy}" ${sortOrder}`;
    query += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  // Получить количество шаблонов
  static async count({ search, isActive }) {
    let query = 'SELECT COUNT(*) FROM survey_templates WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (search) {
      query += ` AND name ILIKE $${paramCount}`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (isActive !== undefined) {
      query += ` AND is_active = $${paramCount}`;
      params.push(isActive);
    }

    const result = await db.query(query, params);
    return parseInt(result.rows[0].count);
  }

  // Получить шаблон по ID
  static async findById(id) {
    const result = await db.query('SELECT * FROM survey_templates WHERE id = $1', [id]);
    return result.rows[0];
  }

  // Создать шаблон
  static async create(data) {
    const result = await db.query(
      `INSERT INTO survey_templates (name, description, is_active, version)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.name, data.description, data.is_active, data.version]
    );
    return new SurveyTemplate(result.rows[0]);
  }

  // Обновить шаблон
  static async update(id, data) {
    const result = await db.query(
      `UPDATE survey_templates
       SET name = $1, description = $2, is_active = $3, version = $4
       WHERE id = $5
       RETURNING *`,
      [data.name, data.description, data.is_active, data.version, id]
    );
    return result.rows[0];
  }

  // Удалить шаблон
  static async delete(id) {
    await db.query('DELETE FROM survey_templates WHERE id = $1', [id]);
  }
}

module.exports = SurveyTemplate;
