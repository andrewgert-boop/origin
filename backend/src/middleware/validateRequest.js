// backend/src/middleware/validateRequest.js
// Единый обработчик ошибок валидации express-validator.

const { validationResult } = require('express-validator');

module.exports = function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return res.status(400).json({ errors: errors.array().map(e => ({ field: e.param, msg: e.msg })) });
};
