// Маршруты для управления сотрудниками
const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employee.controller');
const authenticateToken = require('../middleware/authenticateToken');

// Все маршруты требуют аутентификации
router.use(authenticateToken);

// Пользователь может управлять только сотрудниками своей компании
router.get('/', employeeController.getEmployees);
router.post('/', employeeController.createEmployee);
router.put('/:id', employeeController.updateEmployee);
router.delete('/:id', employeeController.deleteEmployee);

module.exports = router;
