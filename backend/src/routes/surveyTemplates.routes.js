// Маршруты для управления шаблонами опросов
const express = require('express');
const router = express.Router();
const surveyTemplateController = require('../controllers/surveyTemplate.controller');
const authenticateToken = require('../middleware/authenticateToken');
const checkRole = require('../middleware/checkRole');

// Все маршруты требуют аутентификации
router.use(authenticateToken);

// Только admin может управлять шаблонами
router.get('/', checkRole(['admin']), surveyTemplateController.getAllTemplates);
router.get('/:id', checkRole(['admin']), surveyTemplateController.getTemplateById);
router.post('/', checkRole(['admin']), surveyTemplateController.createTemplate);
router.put('/:id', checkRole(['admin']), surveyTemplateController.updateTemplate);
router.delete('/:id', checkRole(['admin']), surveyTemplateController.deleteTemplate);

module.exports = router;
