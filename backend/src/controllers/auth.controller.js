const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../config/logger');

const JWT_SECRET = process.env.JWT_SECRET;

exports.register = async (req, res) => {
  try {
    const { email, password, role, company_id } = req.body;

    console.log('Register: email=', email);

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      email,
      password_hash: hashedPassword,
      role,
      company_id,
    });

    console.log('User created:', user);

    res.status(201).json({
      message: 'User registered successfully',
      user: { id: user.id, email: user.email, role: user.role, companyId: user.company_id },
    });
  } catch (err) {
    console.error('Registration error:', err);
    logger.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt:', email);

    const user = await User.findByEmail(email);
    if (!user) {
      console.log('User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('Stored password_hash:', user.password_hash);

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      console.log('Password mismatch');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role, companyId: user.company_id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('Login success:', email);

    res.json({
      token,
      user: { id: user.id, email: user.email, role: user.role, companyId: user.company_id },
    });
  } catch (err) {
    console.error('Login error:', err);
    logger.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
};
