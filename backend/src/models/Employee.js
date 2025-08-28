// Модель сотрудника
// Содержит чувствительные данные: ФИО, email, должность, отдел — все шифруются
const db = require('../config/db');
const { generateKey, encryptData, decryptData } = require('../utils/encryption.service');
const { MASTER_SECRET } = require('../config/crypto.config');
const logger = require('../config/logger');

class Employee {
  constructor(data) {
    this.id = data.id;
    this.company_id = data.company_id;
    this.first_name = data.first_name;
    this.last_name = data.last_name;
    this.email = data.email;
    this.phone = data.phone || null;
    this.position = data.position;
    this.department = data.department;
    this.created_at = data.created_at;
  }

  /**
   * Хук: автоматически шифрует чувствительные поля перед сохранением
   * @param {Object} data - данные сотрудника
   * @param {string} companyName - название компании (для генерации ключа)
   * @returns {Object} зашифрованные данные
   */
  static async beforeSave(data, companyName) {
    const key = generateKey(companyName, MASTER_SECRET);
    const fields = ['first_name', 'last_name', 'email', 'phone', 'position', 'department'];

    const encryptedData = { ...data };

    for (const field of fields) {
      if (encryptedData[field]) {
        try {
          encryptedData[field] = encryptData(encryptedData[field], key);
        } catch (err) {
          logger.error('Encryption failed for Employee.' + field + ':', err);
          throw new Error('Failed to encrypt employee data');
        }
      }
    }

    return encryptedData;
  }

  /**
   * Хук: автоматически расшифровывает данные после чтения из БД
   * @param {Object} data - зашифрованные данные из БД
   * @param {string} companyName - название компании
   * @returns {Employee|null} расшифрованный экземпляр Employee или null
   */
  static async afterFind(data, companyName) {
    if (!data) return null;

    const key = generateKey(companyName, MASTER_SECRET);
    const result = { ...data };

    const fields = ['first_name', 'last_name', 'email', 'phone', 'position', 'department'];

    for (const field of fields) {
      if (result[field]) {
        try {
          result[field] = decryptData(result[field], key);
        } catch (err) {
          logger.error('Decryption failed for Employee.' + field + ':', err);
          result[field + '_encrypted'] = true; // флаг для диагностики
          result[field] = '[decryption error]';
        }
      }
    }

    return new Employee(result);
  }

  /**
   * Получить сотрудника по ID и company_id (с расшифровкой)
   * @param {number} id - ID сотрудника
   * @param {number} companyId - ID компании
   * @param {string} companyName - название компании
   * @returns {Employee|null}
   */
  static async findByIdAndCompany(id, companyId, companyName) {
    const result = await db.query(
      'SELECT * FROM employees WHERE id = $1 AND company_id = $2',
      [id, companyId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return await this.afterFind(result.rows[0], companyName);
  }

  /**
   * Получить всех сотрудников компании (с пагинацией и фильтрацией)
   * @param {number} companyId - ID компании
   * @param {Object} options - { limit, offset, search, sortBy, sortOrder }
   * @param {string} companyName - название компании для расшифровки
   * @returns {Array<Employee>}
   */
  static async findAllByCompany(companyId, options, companyName) {
    let query = 'SELECT * FROM employees WHERE company_id = $1';
    const params = [companyId];
    let paramCount = 2;

    if (options.search) {
      query += ' AND (first_name ILIKE $' + paramCount + ' OR last_name ILIKE $' + paramCount + ' OR email ILIKE $' + paramCount + ')';
      params.push('%' + options.search + '%');
      paramCount++;
    }

    const sortBy = options.sortBy || 'last_name';
    const sortOrder = options.sortOrder === 'DESC' ? 'DESC' : 'ASC';
    query += ' ORDER BY "' + sortBy + '" ' + sortOrder;

    query += ' LIMIT $' + paramCount + ' OFFSET $' + (paramCount + 1);
    params.push(options.limit, options.offset);

    const result = await db.query(query, params);

    // Расшифровка всех записей
    const decryptedEmployees = [];
    for (const row of result.rows) {
      const decrypted = await this.afterFind(row, companyName);
      decryptedEmployees.push(decrypted);
    }

    return decryptedEmployees;
  }

  /**
   * Подсчитать количество сотрудников (для пагинации)
   * @param {number} companyId
   * @param {Object} options - { search }
   * @returns {number}
   */
  static async countByCompany(companyId, options) {
    let query = 'SELECT COUNT(*) FROM employees WHERE company_id = $1';
    const params = [companyId];
    let paramCount = 2;

    if (options.search) {
      query += ' AND (first_name ILIKE $' + paramCount + ' OR last_name ILIKE $' + paramCount + ' OR email ILIKE $' + paramCount + ')';
      params.push('%' + options.search + '%');
    }

    const result = await db.query(query, params);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Создать нового сотрудника (с шифрованием)
   * @param {Object} data - данные сотрудника
   * @param {string} companyName - название компании
   * @returns {Employee}
   */
  static async create(data, companyName) {
    const encryptedData = await this.beforeSave(data, companyName);

    const result = await db.query(
      'INSERT INTO employees (company_id, first_name, last_name, email, phone, position, department) ' +
      'VALUES ($1, $2, $3, $4, $5, $6, $7) ' +
      'RETURNING id, company_id, first_name, last_name, email, phone, position, department, created_at',
      [
        encryptedData.company_id,
        encryptedData.first_name,
        encryptedData.last_name,
        encryptedData.email,
        encryptedData.phone,
        encryptedData.position,
        encryptedData.department
      ]
    );

    return await this.afterFind(result.rows[0], companyName);
  }

  /**
   * Обновить данные сотрудника (с шифрованием)
   * @param {number} id - ID сотрудника
   * @param {number} companyId - ID компании
   * @param {Object} data - новые данные
   * @param {string} companyName - название компании
   * @returns {Employee|null}
   */
  static async update(id, companyId, data, companyName) {
    const encryptedData = await this.beforeSave(data, companyName);

    const result = await db.query(
      'UPDATE employees ' +
      'SET first_name = $1, last_name = $2, email = $3, phone = $4, position = $5, department = $6 ' +
      'WHERE id = $7 AND company_id = $8 ' +
      'RETURNING id, company_id, first_name, last_name, email, phone, position, department, created_at',
      [
        encryptedData.first_name,
        encryptedData.last_name,
        encryptedData.email,
        encryptedData.phone,
        encryptedData.position,
        encryptedData.department,
        id,
        companyId
      ]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return await this.afterFind(result.rows[0], companyName);
  }

  /**
   * Удалить сотрудника
   * @param {number} id - ID сотрудника
   * @param {number} companyId - ID компании
   */
  static async delete(id, companyId) {
    await db.query('DELETE FROM employees WHERE id = $1 AND company_id = $2', [id, companyId]);
  }
}

module.exports = Employee;