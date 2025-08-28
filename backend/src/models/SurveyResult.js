// Пример модели с шифрованием
const db = require('../config/db');
const { generateKey, encryptData, decryptData } = require('../utils/encryption.service');
const { MASTER_SECRET } = require('../config/crypto.config');

class SurveyResult {
  // ... другие методы

  static async beforeSave(data, companyName) {
    const key = generateKey(companyName, MASTER_SECRET);
    const fields = ['respondent_name', 'email', 'position', 'department', 'notes'];
    for (const field of fields) {
      if (data[field]) {
        data[field] = encryptData(data[field], key);
      }
    }
    return data;
  }

  static async afterFind(data, companyName) {
    if (!data) return null;
    const key = generateKey(companyName, MASTER_SECRET);
    const result = { ...data };
    // ... расшифровка полей
    return result;
  }
}

module.exports = SurveyResult;
