// Контроллер управления шаблонами опросов
const SurveyTemplate = require('../models/SurveyTemplate');
const { getPagination } = require('../utils/pagination');
const logger = require('../config/logger');

// Получить все шаблоны
exports.getAllTemplates = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, isActive, sortBy, sortOrder = 'ASC' } = req.query;
    const { limit: limitNum, offset } = getPagination(page, limit);

    const templates = await SurveyTemplate.findAll({ limit: limitNum, offset, search, isActive, sortBy, sortOrder });
    const total = await SurveyTemplate.count({ search, isActive });

    res.json({
      data: templates,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limitNum),
        limit: limitNum,
      },
    });
  } catch (err) {
    logger.error('Error fetching survey templates:', err);
    res.status(500).json({ error: 'Failed to fetch survey templates' });
  }
};

// Получить шаблон по ID
exports.getTemplateById = async (req, res) => {
  try {
    const template = await SurveyTemplate.findById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Survey template not found' });
    }
    res.json(template);
  } catch (err) {
    logger.error('Error fetching survey template:', err);
    res.status(500).json({ error: 'Failed to fetch survey template' });
  }
};

// Создать шаблон
exports.createTemplate = async (req, res) => {
  try {
    const template = await SurveyTemplate.create(req.body);
    logger.info(`Survey template created: ${template.name}`);
    res.status(201).json(template);
  } catch (err) {
    logger.error('Error creating survey template:', err);
    res.status(500).json({ error: 'Failed to create survey template' });
  }
};

// Обновить шаблон
exports.updateTemplate = async (req, res) => {
  try {
    const template = await SurveyTemplate.update(req.params.id, req.body);
    if (!template) {
      return res.status(404).json({ error: 'Survey template not found' });
    }
    logger.info(`Survey template updated: ${template.name}`);
    res.json(template);
  } catch (err) {
    logger.error('Error updating survey template:', err);
    res.status(500).json({ error: 'Failed to update survey template' });
  }
};

// Удалить шаблон
exports.deleteTemplate = async (req, res) => {
  try {
    await SurveyTemplate.delete(req.params.id);
    logger.info(`Survey template deleted: ${req.params.id}`);
    res.status(204).send();
  } catch (err) {
    logger.error('Error deleting survey template:', err);
    res.status(500).json({ error: 'Failed to delete survey template' });
  }
};
