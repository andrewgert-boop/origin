// Модель ответов на вопросы опроса
// Ответы НЕ шифруются — только сохраняются в JSONB

const db = require('../config/db');

class SurveyResponse {
  constructor(data) {
    this.id = data.id;
    this.survey_assignment_id = data.survey_assignment_id;
    this.question_id = data.question_id;
    this.answer_value = data.answer_value;
    this.responded_at = data.responded_at;
  }

  // Сохраняет ответ (без шифрования)
  static async create(assignmentId, questionId, answerValue) {
    const result = await db.query(
      `INSERT INTO survey_responses (survey_assignment_id, question_id, answer_value)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [assignmentId, questionId, answerValue]
    );

    return new SurveyResponse(result.rows[0]);
  }
}

module.exports = SurveyResponse;
