// backend/src/swagger.js
// Безопасное подключение Swagger UI по /api/docs и JSON по /api/openapi.json.
// Если openapi.yaml отсутствует в контейнере — используем минимальный fallback,
// чтобы НЕ падал бэкенд и документация всё равно открывалась.

const fs = require('fs');
const path = require('path');
const YAML = require('yamljs');
const swaggerUi = require('swagger-ui-express');

function loadSpec() {
  // Кандидаты путей: из корня репо, из соседних директорий, из самой backend-папки
  const candidates = [
    path.join(process.cwd(), 'docs', 'api', 'openapi.yaml'),
    path.join(__dirname, '..', '..', 'docs', 'api', 'openapi.yaml'),
    path.join(__dirname, '..', 'openapi.yaml'),
  ];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        return YAML.load(p);
      }
    } catch (_) { /* пропускаем */ }
  }

  // Fallback-спека, если файл не найден
  return {
    openapi: '3.0.3',
    info: { title: 'Gert Platform API (fallback)', version: '1.0.0' },
    servers: [{ url: 'http://localhost:3000' }],
    paths: {
      '/health': {
        get: {
          summary: 'Health check',
          responses: { '200': { description: 'OK' } }
        }
      }
    },
  };
}

function mountSwagger(app) {
  let spec;
  try {
    spec = loadSpec();
  } catch (e) {
    // Даже если тут что-то пойдёт не так — поднимем пустую спека-заглушку
    spec = { openapi: '3.0.3', info: { title: 'Gert API (empty)', version: '1.0.0' }, paths: {} };
    console.error('Swagger spec load error:', e);
  }

  app.get('/api/openapi.json', (_req, res) => res.json(spec));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(spec, {
    explorer: true,
    customSiteTitle: 'Gert Platform API Docs'
  }));
}

module.exports = { mountSwagger };
