const db = require('../config/db');
const { generateKey, encryptData, decryptData } = require('../utils/encryption.service');
const { MASTER_SECRET } = require('../config/crypto.config');

class User {
  constructor(data) {
    this.id = data.id;
    this.company_id = data.company_id;
    this.email = data.email;
    this.phone = data.phone || null;
    this.role = data.role;
    this.status = data.status;
    this.created_at = data.created_at;
  }

  /**
   * Найти пользователя по email
   * Важно: шифруем email и ищем в БД в зашифрованном виде
   */
  static async findByEmail(email) {
    // Сначала получаем компанию по company_id
    // Но мы не знаем company_id заранее → нужно искать по всем компаниям?

    // Временное решение: предположим, что email шифруется с master-ключом,
    // или используем отдельный индекс для поиска.
    // Но в текущей архитектуре — нужно знать companyName.

    // Альтернатива: хранить hash(email) для поиска
    // Пока — упростим: получим все компании и попробуем для каждой
    const companyResult = await db.query('SELECT id, name FROM companies');
    const companies = companyResult.rows;

    for (const company of companies) {
      const key = generateKey(company.name, MASTER_SECRET);
      const encryptedEmail = encryptData(email, key);

      const result = await db.query('SELECT * FROM users WHERE email = $1', [encryptedEmail]);
      if (result.rows[0]) {
        // Нашли — теперь расшифруем и вернём
        const user = result.rows[0];
        const decrypted = { ...user };

        try {
          if (decrypted.email) {
            decrypted.email = decryptData(decrypted.email, key);
          }
          if (decrypted.phone) {
            decrypted.phone = decryptData(decrypted.phone, key);
          }
        } catch (err) {
          console.error('Decryption error for User:', err.message);
        }

        return new User(decrypted);
      }
    }

    return null;
  }

  static async create(userData) {
    const companyResult = await db.query('SELECT name FROM companies WHERE id = $1', [userData.company_id]);
    if (companyResult.rows.length === 0) {
      throw new Error('Company not found');
    }
    const companyName = companyResult.rows[0].name;
    const key = generateKey(companyName, MASTER_SECRET);

    const encryptedData = { ...userData };

    if (encryptedData.email) {
      encryptedData.email = encryptData(encryptedData.email, key);
    }
    if (encryptedData.phone) {
      encryptedData.phone = encryptData(encryptedData.phone, key);
    }

    const result = await db.query(
      'INSERT INTO users (company_id, email, phone, password_hash, role, status) ' +
      'VALUES ($1, $2, $3, $4, $5, $6) ' +
      'RETURNING *',
      [
        encryptedData.company_id,
        encryptedData.email,
        encryptedData.phone,
        encryptedData.password_hash,
        encryptedData.role,
        encryptedData.status || 'active'
      ]
    );

    return new User(result.rows[0]);
  }
}

module.exports = User;
