// backend/src/tests/crud.smoke.spec.js
// Дымовые CRUD-тесты с RBAC: проверяем базовые ответы и ограничения.

const request = require('supertest');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const app = require('../app');

function sign(user) {
  const secret = process.env.JWT_SECRET || 'devsecret';
  return jwt.sign(user, secret, { expiresIn: '1h' });
}

describe('CRUD smoke with RBAC', () => {
  let adminToken, userToken, companyId, employeeId, templateId;

  beforeAll(async () => {
    await db.query(`DELETE FROM survey_results`);
    await db.query(`DELETE FROM survey_responses`);
    await db.query(`DELETE FROM survey_assignments`);
    await db.query(`DELETE FROM employees`);
    await db.query(`DELETE FROM users`);
    await db.query(`DELETE FROM companies`);
    await db.query(`DELETE FROM survey_templates`);

    const c = await db.query(`INSERT INTO companies (name, contact_email) VALUES ('RBAC Co','rbac@co') RETURNING id`);
    companyId = c.rows[0].id;

    await db.query(`
      INSERT INTO users (company_id, email, phone, password_hash, role, status)
      VALUES ($1, '{"cipher":"", "iv":"", "tag":""}', null, 'hash', 'user', 'active')
    `, [companyId]);

    // один шаблон
    const t = await db.query(`INSERT INTO survey_templates (name, description, is_active, version)
      VALUES ('T1','desc',true,1) RETURNING id`);
    templateId = t.rows[0].id;

    adminToken = sign({ userId: 1, role: 'admin', companyId: null });
    userToken = sign({ userId: 2, role: 'user', companyId });
  });

  it('GET /api/companies as admin -> list', async () => {
    const r = await request(app).get('/api/companies').set('Authorization', `Bearer ${adminToken}`);
    expect(r.statusCode).toBe(200);
    expect(Array.isArray(r.body.items)).toBe(true);
  });

  it('GET /api/companies as user -> only own', async () => {
    const r = await request(app).get('/api/companies').set('Authorization', `Bearer ${userToken}`);
    expect(r.statusCode).toBe(200);
    expect(r.body.items.length).toBe(1);
    expect(r.body.items[0].id).toBeTruthy();
  });

  it('POST /api/companies as user -> 403', async () => {
    const r = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ name: 'Nope Inc' });
    expect(r.statusCode).toBe(403);
  });

  it('Employees CRUD basic', async () => {
    // create employee
    const create = await request(app)
      .post(`/api/companies/${companyId}/employees`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ first_name: 'A', last_name: 'B', email: 'e@e', phone: '1', position: 'P', department: 'D' });
    expect(create.statusCode).toBe(201);
    employeeId = create.body.id;

    // list
    const list = await request(app)
      .get(`/api/companies/${companyId}/employees`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(list.statusCode).toBe(200);
    expect(Array.isArray(list.body.items)).toBe(true);

    // delete
    const del = await request(app)
      .delete(`/api/companies/${companyId}/employees/${employeeId}`)
      .set('Authorization', `Bearer ${userToken}`);
    expect(del.statusCode).toBe(200);
  });

  it('Survey templates admin create/update/delete', async () => {
    const c = await request(app)
      .post('/api/survey-templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'NewTpl', description: 'd', is_active: true, version: 2 });
    expect(c.statusCode).toBe(201);
    const id = c.body.id;

    const u = await request(app)
      .put(`/api/survey-templates/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ description: 'updated' });
    expect(u.statusCode).toBe(200);
    expect(u.body.description).toBe('updated');

    const d = await request(app)
      .delete(`/api/survey-templates/${id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(d.statusCode).toBe(200);
  });
});
