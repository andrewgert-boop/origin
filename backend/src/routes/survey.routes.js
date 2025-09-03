// backend/src/routes/survey.routes.js
// Маршруты этапа 4 — система опросов «Портрет Талантов».
// Единые статусы ТЗ: in_progress_m1 -> completed_m1 -> in_progress_m2 -> completed / not_completed.
// Модуль 1 = 45 минут, Модуль 2 = 15 минут. При истечении М1 — not_completed + заморозка ссылки.

const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const db = require('../config/db');
const SurveyAssignment = require('../models/SurveyAssignment');
const SurveyResponse = require('../models/SurveyResponse');
const SurveyResult = require('../models/SurveyResult');
const { analyzeResults } = require('../services/analysis.service');
const authenticateToken = require('../middleware/authenticateToken');
const checkRole = require('../middleware/checkRole');

const { surveyAssign, publicAnswer } = require('../utils/validation');
const validateRequest = require('../middleware/validateRequest');

// Тайминги из ТЗ
const M1_LIMIT_MS = 45 * 60 * 1000;
const M2_LIMIT_MS = 15 * 60 * 1000;

// Короткая уникальная ссылка (base64url)
function generateUniqueLink() {
  return crypto.randomBytes(16).toString('base64url');
}

// Проверка тайминга текущей сессии
async function ensureTimingAndGetRemaining(assignment) {
  const now = Date.now();

  if (assignment.status === 'in_progress_m1') {
    const started = assignment.started_m1_at ? new Date(assignment.started_m1_at).getTime() : now;
    const remaining = M1_LIMIT_MS - (now - started);
    if (remaining <= 0) {
      await SurveyAssignment.markAsExpired(assignment.id); // not_completed + заморозка
      return { module: null, remainingMs: 0, expired: true };
    }
    return { module: 'm1', remainingMs: remaining, expired: false };
  }

  if (assignment.status === 'in_progress_m2') {
    const started = assignment.started_m2_at ? new Date(assignment.started_m2_at).getTime() : now;
    const remaining = M2_LIMIT_MS - (now - started);
    if (remaining <= 0) {
      // авто-завершение М2 и анализ
      await analyzeResults(assignment.id);
      return { module: null, remainingMs: 0, expired: false };
    }
    return { module: 'm2', remainingMs: remaining, expired: false };
  }

  return { module: null, remainingMs: 0, expired: assignment.status === 'not_completed' };
}

// --------------------------- Админ/Пользователь: массовое назначение ---------------------------
router.post('/survey-assignments',
  authenticateToken, checkRole('admin','user'),
  surveyAssign, validateRequest,
  async (req, res) => {
    const { employee_ids, survey_template_id, send_report_to_respondent = true } = req.body || {};
    const userId = req.user?.userId;

    try {
      const created = [];

      for (const employeeId of employee_ids) {
        const uniqueLink = generateUniqueLink();
        const { rows } = await db.query(
          `INSERT INTO survey_assignments
           (employee_id, survey_template_id, user_id, status, unique_link, assigned_at)
           VALUES ($1,$2,$3,'in_progress_m1',$4,NOW())
           RETURNING *`,
          [employeeId, survey_template_id, userId, uniqueLink]
        );
        created.push(rows[0]);

        // TODO: списание токена продукта
        // TODO: уведомление по email (приглашение с уникальной ссылкой)
      }

      return res.status(201).json({
        count: created.length,
        assignments: created.map(a => ({ id: a.id, unique_link: a.unique_link, status: a.status }))
      });
    } catch (e) {
      console.error('survey-assignments error:', e);
      return res.status(500).json({ error: 'Не удалось назначить опросы' });
    }
  }
);

// --------------------------- Публичная ссылка: статус/таймер ---------------------------
router.get('/public/survey/:uniqueLink', async (req, res) => {
  const { uniqueLink } = req.params;
  try {
    const { rows } = await db.query('SELECT * FROM survey_assignments WHERE unique_link = $1', [uniqueLink]);
    const a = rows[0];
    if (!a) return res.status(404).json({ error: 'Исследование не найдено' });

    // Заморозка: если not_completed — всегда 410
    if (a.status === 'not_completed') {
      return res.status(410).json({
        status: 'not_completed',
        message: 'Время вашей сессии истекло. Обратитесь к HR-менеджеру.'
      });
    }

    // Первый вход в М1 — зафиксировать старт
    if (a.status === 'in_progress_m1' && !a.started_m1_at) {
      await db.query('UPDATE survey_assignments SET started_m1_at = NOW() WHERE id = $1', [a.id]);
      a.started_m1_at = new Date().toISOString();
    }

    const timing = await ensureTimingAndGetRemaining(a);
    if (timing.expired) {
      return res.status(410).json({
        status: 'not_completed',
        message: 'Время вашей сессии истекло. Обратитесь к HR-менеджеру.'
      });
    }

    return res.json({
      assignment_id: a.id,
      status: a.status,
      module: timing.module,
      remaining_ms: timing.remainingMs
    });
  } catch (e) {
    console.error('GET public/survey error:', e);
    return res.status(500).json({ error: 'Ошибка получения статуса опроса' });
  }
});

// --------------------------- Публичная ссылка: потоковое сохранение ответа ---------------------------
router.post('/public/survey/:uniqueLink',
  publicAnswer, validateRequest,
  async (req, res) => {
    const { uniqueLink } = req.params;
    const { question_id, answer_value, module } = req.body || {};

    try {
      const { rows } = await db.query('SELECT * FROM survey_assignments WHERE unique_link = $1', [uniqueLink]);
      const a = rows[0];
      if (!a) return res.status(404).json({ error: 'Исследование не найдено' });

      if (a.status === 'not_completed') return res.status(410).json({ error: 'Сессия истекла' });

      // Защита от несогласованного модуля
      if (module === 'm1' && a.status !== 'in_progress_m1') {
        return res.status(409).json({ error: 'Модуль 1 недоступен' });
      }
      if (module === 'm2' && !['completed_m1','in_progress_m2'].includes(a.status)) {
        return res.status(409).json({ error: 'Модуль 2 недоступен' });
      }

      // Фиксируем старт М2 при первом ответе
      if (module === 'm2' && a.status === 'completed_m1' && !a.started_m2_at) {
        await db.query('UPDATE survey_assignments SET status=$1, started_m2_at=NOW() WHERE id=$2', ['in_progress_m2', a.id]);
      }

      // Тайминг/истечения
      const timing = await ensureTimingAndGetRemaining({ ...a, ...(module==='m2' ? { status: 'in_progress_m2', started_m2_at: a.started_m2_at } : {} ) });
      if (timing.expired) return res.status(410).json({ error: 'Сессия истекла' });

      await SurveyResponse.create(a.id, String(question_id), answer_value, module);
      return res.status(201).json({ ok: true, remaining_ms: timing.remainingMs });
    } catch (e) {
      console.error('POST public/survey error:', e);
      return res.status(500).json({ error: 'Не удалось сохранить ответ' });
    }
  }
);

// --------------------------- Публичная ссылка: явное завершение модуля ---------------------------
router.post('/public/survey/:uniqueLink/complete', async (req, res) => {
  const { uniqueLink } = req.params;
  const { module } = req.body || {};
  if (!['m1','m2'].includes(module)) {
    return res.status(400).json({ error: 'module должен быть m1 или m2' });
  }

  try {
    const { rows } = await db.query('SELECT * FROM survey_assignments WHERE unique_link = $1', [uniqueLink]);
    const a = rows[0];
    if (!a) return res.status(404).json({ error: 'Исследование не найдено' });
    if (a.status === 'not_completed') return res.status(410).json({ error: 'Сессия истекла' });

    if (module === 'm1') {
      if (a.status !== 'in_progress_m1') return res.status(409).json({ error: 'Модуль 1 уже закрыт' });
      await db.query(
        `UPDATE survey_assignments
         SET status='completed_m1',
             m1_duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_m1_at))::int
         WHERE id = $1`,
        [a.id]
      );
      return res.json({ status: 'completed_m1' });
    }

    if (module === 'm2') {
      if (!['in_progress_m2','completed_m1'].includes(a.status)) return res.status(409).json({ error: 'Модуль 2 недоступен' });

      // Зафиксировать длительность М2
      if (!a.started_m2_at) {
        await db.query('UPDATE survey_assignments SET started_m2_at = NOW(), status = $1 WHERE id=$2', ['in_progress_m2', a.id]);
      }
      await db.query(
        `UPDATE survey_assignments
         SET m2_duration_seconds = EXTRACT(EPOCH FROM (NOW() - started_m2_at))::int
         WHERE id = $1`,
        [a.id]
      );

      const results = await analyzeResults(a.id);
      return res.json({ status: 'completed', results_count: results.length });
    }
  } catch (e) {
    console.error('complete module error:', e);
    return res.status(500).json({ error: 'Не удалось завершить модуль' });
  }
});

// --------------------------- Приватный доступ: результаты по assignment_id ---------------------------
router.get('/survey-results',
  authenticateToken, checkRole('admin','user'),
  async (req, res) => {
    const { assignment_id } = req.query;
    if (!assignment_id) return res.status(400).json({ error: 'Требуется assignment_id' });
    try {
      const results = await SurveyResult.findByAssignmentId(Number(assignment_id));
      return res.json({ assignment_id: Number(assignment_id), results });
    } catch (e) {
      console.error('GET /api/survey-results error:', e);
      return res.status(500).json({ error: 'Не удалось получить результаты' });
    }
  }
);

module.exports = router;
