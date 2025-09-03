-- backend/migrations/03_create_employees_table.sql
CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  first_name JSONB,     -- шифрованное поле
  last_name JSONB,      -- шифрованное поле
  email JSONB,          -- шифрованное поле
  phone JSONB,          -- шифрованное поле
  position JSONB,       -- шифрованное поле
  department JSONB,     -- шифрованное поле
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
