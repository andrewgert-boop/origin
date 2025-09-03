// backend/src/server.js
const http = require('http');

const PORT = process.env.PORT || 3000;

console.log(`[BOOT] server.js start, PORT=${PORT}`);

let app;
try {
  console.log('[BOOT] requiring ./app ...');
  app = require('./app'); // <-- если тут что-то падает, поймаем в catch ниже
  console.log('[BOOT] ./app loaded OK');
} catch (e) {
  console.error('[FATAL] App bootstrap error during require("./app"):\n', e);
  // Немного подождём, чтобы лог гарантированно попал в stdout, и упадём — nodemon перезапустит
  setTimeout(() => process.exit(1), 250);
}

if (app) {
  const server = http.createServer(app);

  server.on('error', (err) => {
    console.error('[FATAL] HTTP server error:', err);
  });

  server.listen(PORT, () => {
    console.log(`[READY] Backend listening on :${PORT}`);
  });
}
