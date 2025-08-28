// Контроллер управления компаниями
const Company = require('../models/Company');
const { getPagination } = require('../utils/pagination');
const logger = require('../config/logger');

// Получить все компании (только для admin)
exports.getAllCompanies = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, sortBy, sortOrder = 'ASC' } = req.query;
    const { limit: limitNum, offset } = getPagination(page, limit);

    const companies = await Company.findAll({ limit: limitNum, offset, search, sortBy, sortOrder });
    const total = await Company.countAll({ search });

    res.json({
      data: companies,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limitNum),
        limit: limitNum,
      },
    });
  } catch (err) {
    logger.error('Error fetching companies:', err);
    res.status(500).json({ error: 'Failed to fetch companies' });
  }
};

// Получить компанию по ID
exports.getCompanyById = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    res.json(company);
  } catch (err) {
    logger.error('Error fetching company:', err);
    res.status(500).json({ error: 'Failed to fetch company' });
  }
};

// Создать компанию (только admin)
exports.createCompany = async (req, res) => {
  try {
    const company = await Company.create(req.body);
    logger.info(`Company created: ${company.name}`);
    res.status(201).json(company);
  } catch (err) {
    logger.error('Error creating company:', err);
    res.status(500).json({ error: 'Failed to create company' });
  }
};

// Обновить компанию
exports.updateCompany = async (req, res) => {
  try {
    const company = await Company.update(req.params.id, req.body);
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }
    logger.info(`Company updated: ${company.name}`);
    res.json(company);
  } catch (err) {
    logger.error('Error updating company:', err);
    res.status(500).json({ error: 'Failed to update company' });
  }
};

// Удалить компанию
exports.deleteCompany = async (req, res) => {
  try {
    await Company.delete(req.params.id);
    logger.info(`Company deleted: ${req.params.id}`);
    res.status(204).send();
  } catch (err) {
    logger.error('Error deleting company:', err);
    res.status(500).json({ error: 'Failed to delete company' });
  }
};
