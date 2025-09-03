// backend/src/swagger.js
// Подключение Swagger UI по маршруту /api/docs и JSON по /api/openapi.json

const path = require('path');
const YAML = require('yamljs');
const swaggerUi = require('swagger-ui-express');

const specPath = path.join(process.cwd(), 'docs', 'api', 'openapi.yaml');
const swaggerDocument = YAML.load(specPath);

function mountSwagger(app) {
  app.get('/api/openapi.json', (req, res) => res.json(swaggerDocument));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
    explorer: true,
    customSiteTitle: 'Gert Platform API Docs'
  }));
}

module.exports = { mountSwagger };
