// Контроллер управления сотрудниками
const Employee = require('../models/Employee');
const { getPagination } = require('../utils/pagination');
const logger = require('../config/logger');

// Получить всех сотрудников компании
exports.getEmployees = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { page = 1, limit = 10, search, sortBy, sortOrder = 'ASC' } = req.query;
    const { limit: limitNum, offset } = getPagination(page, limit);

    const employees = await Employee.findAllByCompany(companyId, { limit: limitNum, offset, search, sortBy, sortOrder });
    const total = await Employee.countByCompany(companyId, { search });

    res.json({
      data: employees,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limitNum),
        limit: limitNum,
      },
    });
  } catch (err) {
    logger.error('Error fetching employees:', err);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
};

// Создать сотрудника
exports.createEmployee = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const employee = await Employee.create({ ...req.body, company_id: companyId });
    logger.info(`Employee created: ${employee.first_name} ${employee.last_name}`);
    res.status(201).json(employee);
  } catch (err) {
    logger.error('Error creating employee:', err);
    res.status(500).json({ error: 'Failed to create employee' });
  }
};

// Обновить сотрудника
exports.updateEmployee = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const employee = await Employee.update(req.params.id, companyId, req.body);
    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    logger.info(`Employee updated: ${employee.first_name} ${employee.last_name}`);
    res.json(employee);
  } catch (err) {
    logger.error('Error updating employee:', err);
    res.status(500).json({ error: 'Failed to update employee' });
  }
};

// Удалить сотрудника
exports.deleteEmployee = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    await Employee.delete(req.params.id, companyId);
    logger.info(`Employee deleted: ${req.params.id}`);
    res.status(204).send();
  } catch (err) {
    logger.error('Error deleting employee:', err);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
};
