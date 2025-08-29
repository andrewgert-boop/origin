// Сервис отправки уведомлений
// Использует очередь BullMQ для асинхронной отправки email

const Queue = require('bull');
const db = require('../config/db');
const { generateKey, decryptData } = require('../utils/encryption.service');
const { MASTER_SECRET } = require('../config/crypto.config');

const emailQueue = new Queue('email', { redis: { host: 'redis', port: 6379 } });

// Отправка приглашения респонденту
async function sendSurveyNotification(assignment) {
  // Получаем данные сотрудника (респондента)
  const employee = await db.query('SELECT * FROM employees WHERE id = $1', [assignment.employee_id]);
  const company = await db.query('SELECT name FROM companies WHERE id = $1', [employee.rows[0].company_id]);
  const companyName = company.rows[0].name;
  const key = generateKey(companyName, MASTER_SECRET);

  const firstName = decryptData(employee.rows[0].first_name, key);
  const lastName = decryptData(employee.rows[0].last_name, key);
  const email = decryptData(employee.rows[0].email, key);

  await emailQueue.add('send', {
    to: email,
    subject: 'Пройдите исследование "Портрет Талантов"',
    template: 'survey-invite',
    link: `https://gert.pro/survey/${assignment.unique_link}`
  });
}

// Отправка отчёта пользователю, который назначил опрос
async function sendReportToUser(assignment) {
  // 1. Получаем employee_id из назначения
  const assignmentData = await db.query(`
    SELECT sa.*, e.company_id 
    FROM survey_assignments sa
    JOIN employees e ON e.id = sa.employee_id
    WHERE sa.id = $1`, [assignment.id]);

  const companyId = assignmentData.rows[0].company_id;

  // 2. Получаем пользователя (рекрутера), который пригласил (связан с этой компанией)
  // Предполагаем, что пользователь связан с компанией через company_id
  const userResult = await db.query('SELECT * FROM users WHERE id = $1', [assignment.user_id]);

  if (!userResult.rows[0]) {
    console.error('Пользователь для отправки отчёта не найден');
    return;
  }

  const user = userResult.rows[0];
  const userCompanyName = user.company_name;
  const userKey = generateKey(userCompanyName, MASTER_SECRET);

  // 3. Расшифровываем email пользователя
  let userEmail = user.email;
  try {
    userEmail = decryptData(user.email, userKey);
  } catch (err) {
    console.error('Не удалось расшифровать email пользователя:', err.message);
    return;
  }

  // 4. Формируем имя пользователя
  let userName = 'Уважаемый';
  try {
    const firstName = user.first_name ? decryptData(user.first_name, userKey) : '';
    const lastName = user.last_name ? decryptData(user.last_name, userKey) : '';
    userName = `${firstName} ${lastName}`.trim();
    if (!userName) userName = 'Уважаемый';
  } catch (err) {
    console.error('Не удалось расшифровать ФИО пользователя:', err.message);
  }

  // 5. Отправляем письмо
  await emailQueue.add('send', {
    to: userEmail,
    subject: 'Результаты исследования готовы',
    template: 'report-to-user',
    data: {
      user_name: userName,
      respondent_name: 'Респондент', // Можно улучшить — получить из employee
      report_link: `https://gert.pro/report/${assignment.unique_link}`,
      company_name: user.company_name
    }
  });
}

// Отправка отчёта респонденту (если разрешено)
async function sendReportToRespondent(assignment) {
  const employee = await db.query('SELECT * FROM employees WHERE id = $1', [assignment.employee_id]);
  const company = await db.query('SELECT name FROM companies WHERE id = $1', [employee.rows[0].company_id]);
  const companyName = company.rows[0].name;
  const key = generateKey(companyName, MASTER_SECRET);
  const email = decryptData(employee.rows[0].email, key);

  await emailQueue.add('send', {
    to: email,
    subject: 'Ваш результат исследования готов',
    template: 'report-to-respondent',
    data: {
      respondent_name: decryptData(employee.rows[0].first_name, key),
      report_link: `https://gert.pro/report/${assignment.unique_link}`
    }
  });
}

module.exports = { sendSurveyNotification, sendReportToUser, sendReportToRespondent };
