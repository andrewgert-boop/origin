const db = require('../config/db');

class User {
  constructor(user) {
    this.id = user.id;
    this.email = user.email;
    this.password_hash = user.password_hash;
    this.role = user.role;
    this.company_id = user.company_id;
    this.status = user.status;
    this.created_at = user.created_at;
  }

  static async findByEmail(email) {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] ? new User(result.rows[0]) : null;
  }

  static async create(userData) {
    const { email, password_hash, role, company_id } = userData;
    const result = await db.query(
      `INSERT INTO users (email, password_hash, role, company_id, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING *`,
      [email, password_hash, role, company_id]
    );
    return new User(result.rows[0]);
  }
}

module.exports = User;
