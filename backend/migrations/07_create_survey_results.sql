-- backend/migrations/07_create_survey_results.sql
CREATE TABLE IF NOT EXISTS survey_results (
  id SERIAL PRIMARY KEY,
  survey_assignment_id INTEGER NOT NULL REFERENCES survey_assignments(id) ON DELETE CASCADE,
  parameter_name TEXT NOT NULL,
  raw_score NUMERIC,
  standardized_score NUMERIC,
  interpretation_text TEXT,
  indicator TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sresults_assignment ON survey_results(survey_assignment_id);
