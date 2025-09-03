-- backend/migrations/02_create_users_table.sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
  email JSONB,          -- шифрованное поле: {cipher,iv,tag}
  phone JSONB,          -- шифрованное поле
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','user','employee')),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
