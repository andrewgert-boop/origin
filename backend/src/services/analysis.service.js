// backend/src/services/analysis.service.js
// Интеграция с Python FastAPI анализатором: POST /analyze { assignment_id } -> results[].

const axios = require('axios');
const SurveyResult = require('../models/SurveyResult');
const SurveyAssignment = require('../models/SurveyAssignment');

async function analyzeResults(assignmentId) {
  const baseURL = process.env.ANALYZER_BASE_URL || 'http://analyzer:8000';

  const { data } = await axios.post(`${baseURL}/analyze`, { assignment_id: assignmentId }, { timeout: 25000 });

  if (!data || !Array.isArray(data.results)) {
    throw new Error('Неверный ответ анализатора: нет массива results');
  }

  await SurveyResult.bulkInsert(assignmentId, data.results);
  await SurveyAssignment.markAsCompleted(assignmentId);

  return data.results;
}

module.exports = { analyzeResults };
