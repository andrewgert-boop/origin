const { mountSwagger } = require('./swagger');
// backend/src/app.js
// Инициализация Express: security, парсинг, маршруты, обработчики ошибок.

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth.routes');
const companyRoutes = require('./routes/companies.routes');
const employeeRoutes = require('./routes/employees.routes');
const surveyTemplateRoutes = require('./routes/surveyTemplates.routes');
const surveyRoutes = require('./routes/survey.routes');

const logger = require('./config/logger');

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 1000 }));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_, res) => res.json({ ok: true, service: 'backend' }));


mountSwagger(app);
app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/companies/:companyId/employees', employeeRoutes);
app.use('/api/survey-templates', surveyTemplateRoutes);
app.use('/api', surveyRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: 'Route not found' }));

// Глобальный обработчик ошибок
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error(`${err.status || 500} - ${err.message} - ${req.method} ${req.url}`);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

module.exports = app;
