// backend/src/routes/companies.routes.js
// CRUD компаний с валидацией и RBAC.
// Правила доступа:
// - admin: полный доступ ко всем компаниям;
// - user: чтение/изменение ТОЛЬКО своей компании; создание/удаление запрещены.

const express = require('express');
const router = express.Router();

const db = require('../config/db');
const authenticateToken = require('../middleware/authenticateToken');
const checkRole = require('../middleware/checkRole');
const validateRequest = require('../middleware/validateRequest');
const { pagination, companyCreate, idParam } = require('../utils/validation');

// Хелпер: проверка доступа user к своей компании
async function ensureUserCompanyAccess(req, res, next) {
  try {
    if (req.user?.role === 'admin') return next();
    const userCompanyId = req.user?.companyId;
    const routeCompanyId = Number(req.params.companyId || req.params.id);
    if (routeCompanyId && userCompanyId && routeCompanyId === userCompanyId) return next();
    // Для списка без companyId — user может видеть только свою компанию
    if (!routeCompanyId && userCompanyId) return next();
    return res.status(403).json({ error: 'Forbidden: company scope mismatch' });
  } catch (e) {
    next(e);
  }
}

// GET /api/companies — список
router.get('/',
  authenticateToken, checkRole('admin','user'),
  pagination, validateRequest,
  async (req, res) => {
    const { limit = 50, offset = 0 } = req.query;

    try {
      if (req.user.role === 'admin') {
        const { rows } = await db.query(
          `SELECT id, name, contact_email, status, created_at
           FROM companies
           ORDER BY id
           LIMIT $1 OFFSET $2`, [limit, offset]);
        return res.json({ items: rows, limit: Number(limit), offset: Number(offset) });
      } else {
        // user видит только свою компанию
        const { rows } = await db.query(
          `SELECT id, name, contact_email, status, created_at
           FROM companies WHERE id=$1`, [req.user.companyId]);
        return res.json({ items: rows, limit: Number(limit), offset: Number(offset) });
      }
    } catch (e) {
      console.error('GET /companies error:', e);
      res.status(500).json({ error: 'Не удалось получить список компаний' });
    }
  }
);

// POST /api/companies — создать (admin only)
router.post('/',
  authenticateToken, checkRole('admin'),
  companyCreate, validateRequest,
  async (req, res) => {
    const { name, contact_email } = req.body;
    try {
      const { rows } = await db.query(
        `INSERT INTO companies (name, contact_email) VALUES ($1,$2)
         RETURNING id, name, contact_email, status, created_at`,
        [name, contact_email || null]
      );
      res.status(201).json(rows[0]);
    } catch (e) {
      console.error('POST /companies error:', e);
      res.status(500).json({ error: 'Не удалось создать компанию' });
    }
  }
);

// PUT /api/companies/:id — обновить (admin или user свою)
router.put('/:id',
  authenticateToken, checkRole('admin','user'),
  idParam('id'), companyCreate.map(v => (v.builder && v.builder.fields?.includes('name')) ? v : v), // переиспользуем проверку
  validateRequest, ensureUserCompanyAccess,
  async (req, res) => {
    const { id } = req.params;
    const { name, contact_email, status } = req.body;
    try {
      const fields = [];
      const values = [];
      let i = 1;

      if (name !== undefined) { fields.push(`name = $${i++}`); values.push(name); }
      if (contact_email !== undefined) { fields.push(`contact_email = $${i++}`); values.push(contact_email); }
      if (status !== undefined) { fields.push(`status = $${i++}`); values.push(status); }

      if (!fields.length) {
        const { rows } = await db.query(`SELECT id, name, contact_email, status, created_at FROM companies WHERE id=$1`, [id]);
        return res.json(rows[0] || null);
      }

      values.push(id);
      const { rows } = await db.query(
        `UPDATE companies SET ${fields.join(', ')} WHERE id = $${i} RETURNING id, name, contact_email, status, created_at`,
        values
      );
      res.json(rows[0] || null);
    } catch (e) {
      console.error('PUT /companies/:id error:', e);
      res.status(500).json({ error: 'Не удалось обновить компанию' });
    }
  }
);

// DELETE /api/companies/:id — удалить (admin only)
router.delete('/:id',
  authenticateToken, checkRole('admin'),
  idParam('id'), validateRequest,
  async (req, res) => {
    const { id } = req.params;
    try {
      await db.query(`DELETE FROM companies WHERE id = $1`, [id]);
      res.json({ ok: true });
    } catch (e) {
      console.error('DELETE /companies/:id error:', e);
      res.status(500).json({ error: 'Не удалось удалить компанию' });
    }
  }
);

module.exports = router;
