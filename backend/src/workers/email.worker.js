// backend/src/workers/email.worker.js
// Воркер очереди отправки писем через Bull + Nodemailer. SMTP = Mailhog по умолчанию.

const Queue = require('bull');
const nodemailer = require('nodemailer');

const emailQueue = new Queue('email', {
  redis: { host: process.env.REDIS_HOST || 'redis', port: Number(process.env.REDIS_PORT) || 6379 }
});

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mailhog',
  port: Number(process.env.SMTP_PORT || 1025),
  secure: false,
  auth: (process.env.SMTP_USER && process.env.SMTP_PASS) ? {
    user: process.env.SMTP_USER, pass: process.env.SMTP_PASS
  } : undefined
});

emailQueue.process('send', async (job) => {
  const { to, subject, text, html } = job.data;
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@gert.pro',
    to, subject, text: text || '', html: html || ''
  });
});

console.log('📮 Email worker started...');
