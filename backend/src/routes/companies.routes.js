// Маршруты для управления компаниями
const express = require('express');
const router = express.Router();
const companyController = require('../controllers/company.controller');
const authenticateToken = require('../middleware/authenticateToken');
const checkRole = require('../middleware/checkRole');

// Все маршруты требуют аутентификации
router.use(authenticateToken);

// Только admin может управлять компаниями
router.get('/', checkRole(['admin']), companyController.getAllCompanies);
router.get('/:id', checkRole(['admin']), companyController.getCompanyById);
router.post('/', checkRole(['admin']), companyController.createCompany);
router.put('/:id', checkRole(['admin']), companyController.updateCompany);
router.delete('/:id', checkRole(['admin']), companyController.deleteCompany);

module.exports = router;
