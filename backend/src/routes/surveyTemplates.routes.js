// backend/src/routes/surveyTemplates.routes.js
// CRUD шаблонов опросов.
// Доступ: admin — полный; user — чтение (GET), создание/обновление/удаление опционально можно дать user, но по ТЗ — обычно admin.

const express = require('express');
const router = express.Router();

const db = require('../config/db');
const authenticateToken = require('../middleware/authenticateToken');
const checkRole = require('../middleware/checkRole');
const validateRequest = require('../middleware/validateRequest');
const { pagination } = require('../utils/validation');

// GET список
router.get('/',
  authenticateToken, checkRole('admin','user'),
  pagination, validateRequest,
  async (req, res) => {
    const { limit = 50, offset = 0 } = req.query;
    try {
      const { rows } = await db.query(
        `SELECT id, name, description, is_active, version, created_at
         FROM survey_templates
         ORDER BY id
         LIMIT $1 OFFSET $2`, [limit, offset]);
      res.json({ items: rows, limit: Number(limit), offset: Number(offset) });
    } catch (e) {
      console.error('GET /survey-templates error:', e);
      res.status(500).json({ error: 'Не удалось получить шаблоны' });
    }
  }
);

// POST создать (admin only)
router.post('/',
  authenticateToken, checkRole('admin'),
  validateRequest,
  async (req, res) => {
    const { name, description, is_active = true, version = 1 } = req.body || {};
    if (!name) return res.status(400).json({ error: 'name обязателен' });
    try {
      const { rows } = await db.query(
        `INSERT INTO survey_templates (name, description, is_active, version)
         VALUES ($1,$2,$3,$4)
         RETURNING id, name, description, is_active, version, created_at`,
        [name, description || null, !!is_active, Number(version)]
      );
      res.status(201).json(rows[0]);
    } catch (e) {
      console.error('POST /survey-templates error:', e);
      res.status(500).json({ error: 'Не удалось создать шаблон' });
    }
  }
);

// PUT обновить (admin only)
router.put('/:id',
  authenticateToken, checkRole('admin'),
  validateRequest,
  async (req, res) => {
    const { id } = req.params;
    const { name, description, is_active, version } = req.body || {};
    try {
      const fields = [];
      const values = [];
      let i = 1;

      if (name !== undefined) { fields.push(`name = $${i++}`); values.push(name); }
      if (description !== undefined) { fields.push(`description = $${i++}`); values.push(description); }
      if (is_active !== undefined) { fields.push(`is_active = $${i++}`); values.push(!!is_active); }
      if (version !== undefined) { fields.push(`version = $${i++}`); values.push(Number(version)); }

      if (!fields.length) {
        const { rows } = await db.query(
          `SELECT id, name, description, is_active, version, created_at FROM survey_templates WHERE id=$1`, [id]);
        return res.json(rows[0] || null);
      }

      values.push(id);
      const { rows } = await db.query(
        `UPDATE survey_templates SET ${fields.join(', ')} WHERE id=$${i}
         RETURNING id, name, description, is_active, version, created_at`, values);
      res.json(rows[0] || null);
    } catch (e) {
      console.error('PUT /survey-templates/:id error:', e);
      res.status(500).json({ error: 'Не удалось обновить шаблон' });
    }
  }
);

// DELETE (admin only)
router.delete('/:id',
  authenticateToken, checkRole('admin'),
  validateRequest,
  async (req, res) => {
    const { id } = req.params;
    try {
      await db.query(`DELETE FROM survey_templates WHERE id=$1`, [id]);
      res.json({ ok: true });
    } catch (e) {
      console.error('DELETE /survey-templates/:id error:', e);
      res.status(500).json({ error: 'Не удалось удалить шаблон' });
    }
  }
);

module.exports = router;
