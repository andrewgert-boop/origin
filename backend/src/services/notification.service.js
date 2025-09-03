// backend/src/services/notification.service.js
// Обёртка над очередью писем. Вызывайте из бизнес-логики назначения/завершения опроса.

const Queue = require('bull');
const emailQueue = new Queue('email', {
  redis: { host: process.env.REDIS_HOST || 'redis', port: Number(process.env.REDIS_PORT) || 6379 }
});

async function sendInvitationEmail({ to, link }) {
  await emailQueue.add('send', {
    to,
    subject: 'Приглашение к прохождению опроса «Портрет Талантов»',
    html: `<p>Здравствуйте! Вас пригласили пройти опрос.</p>
           <p>Перейдите по ссылке: <a href="${link}" target="_blank" rel="noopener">${link}</a></p>`
  });
}

async function sendCompletionEmail({ to, assignmentId }) {
  await emailQueue.add('send', {
    to,
    subject: 'Опрос завершён',
    html: `<p>Опрос завершён. ID назначения: ${assignmentId}.</p>`
  });
}

module.exports = { sendInvitationEmail, sendCompletionEmail };
