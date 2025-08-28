const express = require('express');
const router = express.Router();
const { validateRegistration, validateLogin } = require('../middleware/validate');
const { register, login } = require('../controllers/auth.controller');

router.post('/register', validateRegistration, register);
router.post('/login', validateLogin, login);

module.exports = router;
