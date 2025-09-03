// backend/src/tests/health.spec.js
const request = require('supertest');
const app = require('../app');

describe('Health', () => {
  it('GET /health -> ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('ok', true);
  });
});
