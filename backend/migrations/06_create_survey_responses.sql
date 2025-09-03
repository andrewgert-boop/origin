-- backend/migrations/06_create_survey_responses.sql
CREATE TABLE IF NOT EXISTS survey_responses (
  id SERIAL PRIMARY KEY,
  survey_assignment_id INTEGER NOT NULL REFERENCES survey_assignments(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  answer_value JSONB NOT NULL,
  module TEXT NOT NULL CHECK (module IN ('m1','m2')),
  responded_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sresponses_assignment ON survey_responses(survey_assignment_id);
CREATE INDEX IF NOT EXISTS idx_sresponses_question ON survey_responses(question_id);
