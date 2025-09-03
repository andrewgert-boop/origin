-- backend/migrations/05_create_survey_assignments.sql
CREATE TABLE IF NOT EXISTS survey_assignments (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  survey_template_id INTEGER NOT NULL REFERENCES survey_templates(id) ON DELETE RESTRICT,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN (
    'in_progress_m1','completed_m1','in_progress_m2','completed','not_completed'
  )),
  unique_link TEXT NOT NULL UNIQUE,
  assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
  started_m1_at TIMESTAMP,
  started_m2_at TIMESTAMP,
  completed_at TIMESTAMP,
  m1_duration_seconds INTEGER,
  m2_duration_seconds INTEGER
);
CREATE INDEX IF NOT EXISTS idx_sassign_unique_link ON survey_assignments(unique_link);
CREATE INDEX IF NOT EXISTS idx_sassign_employee ON survey_assignments(employee_id);
