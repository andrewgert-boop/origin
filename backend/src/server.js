console.log('Starting server...');
const app = require('./app');
const logger = require('./config/logger');

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log('Server running on http://0.0.0.0:' + PORT);
  logger.info('Server running on http://0.0.0.0:' + PORT);
});