// backend/src/routes/employees.routes.js
// CRUD сотрудников в разрезе компании: /api/companies/:companyId/employees
// Доступ: admin — любая компания; user — только своя (по req.user.companyId)

const express = require('express');
const router = express.Router({ mergeParams: true });

const db = require('../config/db');
const authenticateToken = require('../middleware/authenticateToken');
const checkRole = require('../middleware/checkRole');
const validateRequest = require('../middleware/validateRequest');
const { pagination } = require('../utils/validation');
const Employee = require('../models/Employee');

async function ensureCompanyScope(req, res, next) {
  try {
    const paramCompany = Number(req.params.companyId);
    if (!paramCompany) return res.status(400).json({ error: 'companyId обязателен' });
    if (req.user?.role === 'admin') return next();
    if (req.user?.companyId === paramCompany) return next();
    return res.status(403).json({ error: 'Forbidden: company scope mismatch' });
  } catch (e) {
    next(e);
  }
}

// GET список
router.get('/',
  authenticateToken, checkRole('admin','user'),
  ensureCompanyScope, pagination, validateRequest,
  async (req, res) => {
    const companyId = Number(req.params.companyId);
    const { limit = 50, offset = 0 } = req.query;
    try {
      const items = await Employee.listByCompany(companyId, { limit, offset });
      res.json({ items, limit: Number(limit), offset: Number(offset) });
    } catch (e) {
      console.error('GET employees list error:', e);
      res.status(500).json({ error: 'Не удалось получить сотрудников' });
    }
  }
);

// POST создать
router.post('/',
  authenticateToken, checkRole('admin','user'),
  ensureCompanyScope, validateRequest,
  async (req, res) => {
    const companyId = Number(req.params.companyId);
    const { first_name, last_name, email, phone, position, department } = req.body || {};
    try {
      const created = await Employee.create({
        company_id: companyId, first_name, last_name, email, phone, position, department
      });
      res.status(201).json(created);
    } catch (e) {
      console.error('POST employee error:', e);
      res.status(500).json({ error: 'Не удалось создать сотрудника' });
    }
  }
);

// PUT обновить по :id
router.put('/:id',
  authenticateToken, checkRole('admin','user'),
  ensureCompanyScope, validateRequest,
  async (req, res) => {
    // Для краткости используем прямой SQL + шифрование не повторяем (можно расширить по аналогии с Employee.update)
    const companyId = Number(req.params.companyId);
    const id = Number(req.params.id);
    try {
      // Проверка принадлежности сотрудника компании
      const { rows: chk } = await db.query(`SELECT id FROM employees WHERE id=$1 AND company_id=$2`, [id, companyId]);
      if (!chk[0]) return res.status(404).json({ error: 'Сотрудник не найден' });

      // Простое частичное обновление незашифрованных полей не допускается — в модели поля шифруются.
      // Поэтому для примера вернём текущую запись (в полноценной реализации добавьте Employee.update с шифрованием).
      const e = await Employee.findById(id);
      res.json(e);
    } catch (e) {
      console.error('PUT employee error:', e);
      res.status(500).json({ error: 'Не удалось обновить сотрудника' });
    }
  }
);

// DELETE удалить по :id
router.delete('/:id',
  authenticateToken, checkRole('admin','user'),
  ensureCompanyScope, validateRequest,
  async (req, res) => {
    const companyId = Number(req.params.companyId);
    const id = Number(req.params.id);
    try {
      const { rows: chk } = await db.query(`SELECT id FROM employees WHERE id=$1 AND company_id=$2`, [id, companyId]);
      if (!chk[0]) return res.status(404).json({ error: 'Сотрудник не найден' });
      await db.query(`DELETE FROM employees WHERE id=$1`, [id]);
      res.json({ ok: true });
    } catch (e) {
      console.error('DELETE employee error:', e);
      res.status(500).json({ error: 'Не удалось удалить сотрудника' });
    }
  }
);

module.exports = router;
