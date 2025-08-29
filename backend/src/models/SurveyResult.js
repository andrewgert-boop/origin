// Модель результатов анализа
// Результаты НЕ шифруются — только сохраняются с интерпретацией

const db = require('../config/db');

class SurveyResult {
  constructor(data) {
    this.id = data.id;
    this.survey_assignment_id = data.survey_assignment_id;
    this.parameter_name = data.parameter_name;
    this.raw_score = data.raw_score;
    this.standardized_score = data.standardized_score;
    this.interpretation_text = data.interpretation_text;
    this.indicator = data.indicator;
    this.created_at = data.created_at;
  }

  // Сохраняет результаты (без шифрования)
  static async saveResults(assignmentId, results) {
    const query = `
      INSERT INTO survey_results 
      (survey_assignment_id, parameter_name, raw_score, standardized_score, interpretation_text, indicator)
      VALUES ${results.map((_, i) => `($${i*6+1}, $${i*6+2}, $${i*6+3}, $${i*6+4}, $${i*6+5}, $${i*6+6})`).join(', ')}
    `;

    const values = [];
    for (const r of results) {
      values.push(assignmentId, r.parameter_name, r.raw_score, r.standardized_score, r.interpretation_text, r.indicator);
    }

    await db.query(query, values);
  }

  // Получает результаты по ID назначения
  static async findByAssignmentId(assignmentId) {
    const result = await db.query('SELECT * FROM survey_results WHERE survey_assignment_id = $1', [assignmentId]);
    return result.rows;
  }
}

module.exports = SurveyResult;
