// backend/src/tests/survey.e2e.spec.js
// Интеграционный сценарий: назначение -> прохождение (М1/М2) -> анализ -> результаты.
// Анализатор замокан: возвращаем фиктивные метрики.

const request = require('supertest');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// Мокаем анализатор ДО импорта app/роутов
jest.mock('../services/analysis.service', () => ({
  analyzeResults: async (assignmentId) => {
    return [
      { parameter_name: 'Creativity', raw_score: 12, standardized_score: 65, interpretation_text: 'Высокая креативность' },
      { parameter_name: 'Leadership', raw_score: 9, standardized_score: 55, interpretation_text: 'Хорошие лидерские качества' },
    ];
  }
}));

const app = require('../app');

function sign(user) {
  const secret = process.env.JWT_SECRET || 'devsecret';
  return jwt.sign(user, secret, { expiresIn: '1h' });
}

describe('E2E Survey flow', () => {
  let adminToken, userToken;
  let companyId, userId, employeeId, templateId;

  beforeAll(async () => {
    // Чистим ключевые таблицы (минимально)
    await db.query(`DELETE FROM survey_results`);
    await db.query(`DELETE FROM survey_responses`);
    await db.query(`DELETE FROM survey_assignments`);
    await db.query(`DELETE FROM employees`);
    await db.query(`DELETE FROM users`);
    await db.query(`DELETE FROM companies`);
    await db.query(`DELETE FROM survey_templates`);

    // Создаём компанию
    const c = await db.query(`INSERT INTO companies (name, contact_email) VALUES ('TestCo','hr@test.co') RETURNING id`);
    companyId = c.rows[0].id;

    // Пользователь (role=user)
    const u = await db.query(`
      INSERT INTO users (company_id, email, phone, password_hash, role, status)
      VALUES ($1, '{"cipher":"", "iv":"", "tag":""}', null, 'hash', 'user', 'active')
      RETURNING id
    `, [companyId]);
    userId = u.rows[0].id;

    // Сотрудник
    const e = await db.query(`
      INSERT INTO employees (company_id, first_name, last_name, email, phone, position, department)
      VALUES ($1, null, null, null, null, null, null)
      RETURNING id
    `, [companyId]);
    employeeId = e.rows[0].id;

    // Шаблон опроса
    const t = await db.query(`
      INSERT INTO survey_templates (name, description, is_active, version)
      VALUES ('Portrait of Talents v1', 'Base template', true, 1)
      RETURNING id
    `);
    templateId = t.rows[0].id;

    adminToken = sign({ userId: 999, role: 'admin', companyId: null });
    userToken = sign({ userId, role: 'user', companyId });
  });

  it('Назначение опроса (user)', async () => {
    const res = await request(app)
      .post('/api/survey-assignments')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ employee_ids: [employeeId], survey_template_id: templateId });

    expect(res.statusCode).toBe(201);
    expect(res.body.count).toBe(1);
    expect(res.body.assignments[0]).toHaveProperty('unique_link');
  });

  it('Публичная ссылка: старт М1 и проверка таймера', async () => {
    // Получаем ссылку из БД (так проще, чем парсить прошлый ответ)
    const q = await db.query(`SELECT id, unique_link, status FROM survey_assignments ORDER BY id DESC LIMIT 1`);
    const uniqueLink = q.rows[0].unique_link;

    const res = await request(app).get(`/api/public/survey/${uniqueLink}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('in_progress_m1');
    expect(res.body.module).toBe('m1');
    expect(res.body.remaining_ms).toBeGreaterThan(0);
  });

  it('Стрим ответов М1 и завершение М1', async () => {
    const q = await db.query(`SELECT id, unique_link FROM survey_assignments ORDER BY id DESC LIMIT 1`);
    const uniqueLink = q.rows[0].unique_link;

    // Два ответа М1
    const r1 = await request(app)
      .post(`/api/public/survey/${uniqueLink}`)
      .send({ question_id: 'm1_q1', answer_value: 3, module: 'm1' });
    expect(r1.statusCode).toBe(201);

    const r2 = await request(app)
      .post(`/api/public/survey/${uniqueLink}`)
      .send({ question_id: 'm1_q2', answer_value: 4, module: 'm1' });
    expect(r2.statusCode).toBe(201);

    // Явное завершение М1
    const rc = await request(app)
      .post(`/api/public/survey/${uniqueLink}/complete`)
      .send({ module: 'm1' });
    expect(rc.statusCode).toBe(200);
    expect(rc.body.status).toBe('completed_m1');
  });

  it('Стрим ответов М2 и завершение М2 (анализ мокируется)', async () => {
    const q = await db.query(`SELECT id, unique_link FROM survey_assignments ORDER BY id DESC LIMIT 1`);
    const uniqueLink = q.rows[0].unique_link;

    // Первый ответ М2 — переведёт статус в in_progress_m2
    const r1 = await request(app)
      .post(`/api/public/survey/${uniqueLink}`)
      .send({ question_id: 'm2_q1', answer_value: [1,2,3], module: 'm2' });
    expect(r1.statusCode).toBe(201);

    // Ещё один ответ М2
    const r2 = await request(app)
      .post(`/api/public/survey/${uniqueLink}`)
      .send({ question_id: 'm2_q2', answer_value: { a: 1 }, module: 'm2' });
    expect(r2.statusCode).toBe(201);

    // Завершение М2 => вызов мок-анализа и запись результатов
    const rc = await request(app)
      .post(`/api/public/survey/${uniqueLink}/complete`)
      .send({ module: 'm2' });
    expect(rc.statusCode).toBe(200);
    expect(rc.body.status).toBe('completed');
    expect(rc.body.results_count).toBeGreaterThan(0);
  });

  it('Проверка результатов (privat, user)', async () => {
    const a = await db.query(`SELECT id FROM survey_assignments ORDER BY id DESC LIMIT 1`);
    const assignmentId = a.rows[0].id;

    const res = await request(app)
      .get(`/api/survey-results?assignment_id=${assignmentId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.assignment_id).toBe(assignmentId);
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results.length).toBeGreaterThan(0);
  });
});
