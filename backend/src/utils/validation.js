// backend/src/utils/validation.js
// Набор валидаторов для типичных кейсов API.

const { body, param, query } = require('express-validator');

const pagination = [
  query('limit').optional().isInt({ min: 1, max: 200 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
  query('sort').optional().isString().trim().isLength({ max: 64 }),
  query('order').optional().isIn(['asc','desc']).toLowerCase(),
];

const idParam = (name='id') => [ param(name).isInt({ min:1 }).toInt() ];

const companyCreate = [
  body('name').isString().trim().isLength({ min:2, max:200 }),
  body('contact_email').optional().isEmail().normalizeEmail(),
];

const surveyAssign = [
  body('employee_ids').isArray({ min:1 }),
  body('employee_ids.*').isInt({ min:1 }),
  body('survey_template_id').isInt({ min:1 }),
  body('send_report_to_respondent').optional().isBoolean().toBoolean(),
];

const publicAnswer = [
  body('question_id').exists().isString().trim(),
  body('module').isIn(['m1','m2']),
  body('answer_value').exists(),
];

module.exports = {
  pagination,
  idParam,
  companyCreate,
  surveyAssign,
  publicAnswer,
};
