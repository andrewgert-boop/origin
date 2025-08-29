// API маршруты для работы с опросами
// Включают назначение, прохождение и получение результатов

const express = require('express');
const router = express.Router();
const SurveyAssignment = require('../models/SurveyAssignment');
const SurveyResponse = require('../models/SurveyResponse');
const SurveyResult = require('../models/SurveyResult');
const { sendSurveyNotification, sendReportToUser, sendReportToRespondent } = require('../services/notification.service');
const { analyzeResults } = require('../services/analysis.service');

// Middleware: Проверка аутентификации
const authMiddleware = require('../middleware/auth');

// POST /api/survey-assignments — массовое назначение опросов
router.post('/survey-assignments', authMiddleware, async (req, res) => {
  const { employee_ids, survey_template_id, send_report_to_respondent } = req.body;
  const userId = req.user.userId; // Получаем из JWT

  try {
    // Проверяем, что у пользователя есть доступ к компании сотрудников
    for (const employeeId of employee_ids) {
      const employee = await db.query('SELECT company_id FROM employees WHERE id = $1', [employeeId]);
      if (!employee.rows[0]) {
        return res.status(400).json({ error: `Сотрудник с id=${employeeId} не найден` });
      }

      const user = await db.query('SELECT company_id FROM users WHERE id = $1', [userId]);
      if (user.rows[0].company_id !== employee.rows[0].company_id) {
        return res.status(403).json({ error: 'Нет доступа к сотрудникам этой компании' });
      }
    }

    // Проверяем, есть ли доступные токены у клиента
    const companyResult = await db.query('SELECT company_id FROM users WHERE id = $1', [userId]);
    const companyId = companyResult.rows[0].company_id;

    const tokenResult = await db.query(`
      SELECT total_tokens, used_tokens 
      FROM product_tokens 
      WHERE client_id = $1 AND product_key = 'portrait_of_talents'
    `, [companyId]);

    if (!tokenResult.rows[0]) {
      return res.status(400).json({ error: 'Токены для "Портрет талантов" не назначены' });
    }

    const { total_tokens, used_tokens } = tokenResult.rows[0];
    if (used_tokens >= total_tokens) {
      return res.status(400).json({ error: 'Закончились токены для "Портрет талантов"' });
    }

    // Проверяем, не приостановлены ли исследования
    const tariffResult = await db.query('SELECT is_paused FROM client_tariffs WHERE client_id = $1', [companyId]);
    if (tariffResult.rows[0]?.is_paused) {
      return res.status(400).json({ 
        error: 'Отправка исследований приостановлена. Обратитесь к администратору платформы.' 
      });
    }

    // Создаём назначения
    const assignments = [];
    for (const employeeId of employee_ids) {
      const assignment = await SurveyAssignment.create(
        employeeId, 
        survey_template_id, 
        userId, 
        send_report_to_respondent
      );
      assignments.push(assignment);
      await sendSurveyNotification(assignment);
    }

    // Обновляем счётчик использованных токенов
    await db.query(
      'UPDATE product_tokens SET used_tokens = used_tokens + $1 WHERE client_id = $2 AND product_key = $3',
      [employee_ids.length, companyId, 'portrait_of_talants']
    );

    res.status(201).json({ assignments });
  } catch (err) {
    console.error('Ошибка при назначении опроса:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/public/survey/:uniqueLink — получение опроса по ссылке
router.get('/public/survey/:uniqueLink', async (req, res) => {
  const { uniqueLink } = req.params;

  try {
    const assignment = await SurveyAssignment.findByUniqueLink(uniqueLink);
    if (!assignment) return res.status(404).json({ error: 'Опрос не найден' });
    if (assignment.status !== 'pending') return res.status(400).json({ error: 'Опрос уже пройден или истёк' });
    if (new Date() > new Date(assignment.expires_at)) return res.status(400).json({ error: 'Срок прохождения истёк' });

    const template = await db.query('SELECT * FROM survey_templates WHERE id = $1', [assignment.survey_template_id]);
    const questions = await db.query('SELECT * FROM survey_questions WHERE template_id = $1 ORDER BY id', [template.rows[0].id]);

    res.json({
      assignment,
      template: template.rows[0],
      questions: questions.rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/public/survey/:uniqueLink — отправка ответов
router.post('/public/survey/:uniqueLink', async (req, res) => {
  const { uniqueLink } = req.params;
  const { responses } = req.body;

  try {
    const assignment = await SurveyAssignment.findByUniqueLink(uniqueLink);
    if (!assignment) return res.status(404).json({ error: 'Опрос не найден' });
    if (assignment.status !== 'pending') return res.status(400).json({ error: 'Опрос уже пройден' });

    for (const r of responses) {
      await SurveyResponse.create(assignment.id, r.question_id, r.answer_value);
    }

    await SurveyAssignment.markAsCompleted(assignment.id);

    // Вызов Python-микросервиса для анализа
    const analysisResults = await analyzeResults(assignment.id);
    await SurveyResult.saveResults(assignment.id, analysisResults);

    // Отправка отчётов
    await sendReportToUser(assignment);
    if (assignment.send_report_to_respondent) {
      await sendReportToRespondent(assignment);
    }

    res.status(200).json({ message: 'Опрос успешно завершён' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/survey-results — получение результатов для пользователя
router.get('/survey-results', authMiddleware, async (req, res) => {
  const userId = req.user.userId;

  try {
    // Получаем только назначения, созданные этим пользователем
    const result = await db.query(`
      SELECT sa.*, st.name as template_name, e.first_name, e.last_name, e.email
      FROM survey_assignments sa
      JOIN survey_templates st ON st.id = sa.survey_template_id
      JOIN employees e ON e.id = sa.employee_id
      WHERE sa.user_id = $1
      ORDER BY sa.assigned_at DESC
    `, [userId]);

    // Расшифровываем данные сотрудников
    const assignments = await Promise.all(result.rows.map(async (row) => {
      const company = await db.query('SELECT name FROM companies WHERE id = $1', [row.company_id]);
      const companyName = company.rows[0].name;
      const key = generateKey(companyName, MASTER_SECRET);

      return {
        ...row,
        first_name: decryptData(row.first_name, key),
        last_name: decryptData(row.last_name, key),
        email: decryptData(row.email, key)
      };
    }));

    res.json({ results: assignments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
