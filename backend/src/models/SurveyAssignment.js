// Модель назначения опроса
// Содержит ссылку на сотрудника, шаблон опроса, статус, уникальную ссылку и user_id

const db = require('../config/db');
const { generateKey, encryptData, decryptData } = require('../utils/encryption.service');
const { MASTER_SECRET } = require('../config/crypto.config');
const crypto = require('crypto');

class SurveyAssignment {
  constructor(data) {
    this.id = data.id;
    this.employee_id = data.employee_id;
    this.survey_template_id = data.survey_template_id;
    this.user_id = data.user_id;
    this.status = data.status;
    this.unique_link = data.unique_link;
    this.assigned_at = data.assigned_at;
    this.completed_at = data.completed_at;
    this.expires_at = this.expires_at;
    this.send_report_to_respondent = data.send_report_to_respondent;
  }

  // Создаёт новое назначение опроса
  static async create(employeeId, surveyTemplateId, userId, sendReportToRespondent = false) {
    const employee = await db.query('SELECT * FROM employees WHERE id = $1', [employeeId]);
    if (!employee.rows[0]) {
      throw new Error('Сотрудник не найден');
    }

    const link = crypto.randomUUID();

    const result = await db.query(
      `INSERT INTO survey_assignments 
       (employee_id, survey_template_id, user_id, unique_link, status, send_report_to_respondent)
       VALUES ($1, $2, $3, $4, 'pending', $5)
       RETURNING *`,
      [employeeId, surveyTemplateId, userId, link, sendReportToRespondent]
    );

    return new SurveyAssignment(result.rows[0]);
  }

  // Находит назначение по уникальной ссылке
  static async findByUniqueLink(uniqueLink) {
    const result = await db.query(`
      SELECT sa.*, st.product_key 
      FROM survey_assignments sa
      JOIN survey_templates st ON st.id = sa.survey_template_id
      WHERE sa.unique_link = $1`, [uniqueLink]);

    return result.rows[0] || null;
  }

  // Отмечает опрос как завершённый
  static async markAsCompleted(assignmentId) {
    await db.query(
      'UPDATE survey_assignments SET status = $1, completed_at = NOW() WHERE id = $2',
      ['completed', assignmentId]
    );
  }

  // Устанавливает статус "не успел"
  static async markAsExpired(assignmentId) {
    await db.query(
      'UPDATE survey_assignments SET status = $1, completed_at = NOW() WHERE id = $2',
      ['not_completed', assignmentId]
    );
  }
}

module.exports = SurveyAssignment;
