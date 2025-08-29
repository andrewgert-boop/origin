const express = require('express');
const router = express.Router();
const allowedFields = ['email', 'password', 'role', 'company_id', 'first_name', 'last_name', 'middle_name', 'phone'];
const { validateRegistration, validateLogin } = require('../middleware/validate');
const { register, login } = require('../controllers/auth.controller');

router.post('/register', validateRegistration, register);
router.post('/login', validateLogin, login);

module.exports = router;
