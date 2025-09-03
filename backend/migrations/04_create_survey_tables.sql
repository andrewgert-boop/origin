-- Создание таблиц для модуля "Портрет Талантов"

-- Шаблоны опросов
CREATE TABLE IF NOT EXISTS survey_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  version VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Вопросы шаблонов
CREATE TABLE IF NOT EXISTS survey_questions (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES survey_templates(id) ON DELETE CASCADE,
  question_id VARCHAR(50) NOT NULL,
  text TEXT NOT NULL,
  test INTEGER NOT NULL,
  options JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Назначения опросов
CREATE TABLE IF NOT EXISTS survey_assignments (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  survey_template_id INTEGER NOT NULL REFERENCES survey_templates(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'processing', 'completed', 'timeout', 'processing_failed')),
  unique_link VARCHAR(255) UNIQUE NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  time_spent JSONB DEFAULT '{"module1": 0, "module2": 0}'::jsonb,
  timeout_modules VARCHAR(50)[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ответы на опросы
CREATE TABLE IF NOT EXISTS survey_responses (
  id SERIAL PRIMARY KEY,
  survey_assignment_id INTEGER NOT NULL REFERENCES survey_assignments(id) ON DELETE CASCADE,
  question_id VARCHAR(50) NOT NULL,
  answer_value VARCHAR(255) NOT NULL,
  responded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  time_spent JSONB DEFAULT '{"module1": 0, "module2": 0}'::jsonb
);

-- Результаты анализа
CREATE TABLE IF NOT EXISTS survey_results (
  id SERIAL PRIMARY KEY,
  survey_assignment_id INTEGER NOT NULL REFERENCES survey_assignments(id) ON DELETE CASCADE,
  parameter_name VARCHAR(255) NOT NULL,
  raw_score INTEGER NOT NULL,
  standardized_score NUMERIC(5,2) NOT NULL,
  expression_level VARCHAR(50),
  indicator VARCHAR(20),
  interpretation_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Индексы для оптимизации запросов
CREATE INDEX idx_survey_assignments_employee ON survey_assignments(employee_id);
CREATE INDEX idx_survey_assignments_template ON survey_assignments(survey_template_id);
CREATE INDEX idx_survey_assignments_status ON survey_assignments(status);
CREATE INDEX idx_survey_responses_assignment ON survey_responses(survey_assignment_id);
CREATE INDEX idx_survey_results_assignment ON survey_results(survey_assignment_id);
CREATE INDEX idx_survey_results_parameter ON survey_results(parameter_name);

-- Добавляем триггер для обновления updated_at
CREATE OR REPLACE FUNCTION update_survey_templates_modified()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_survey_templates_modtime
BEFORE UPDATE ON survey_templates
FOR EACH ROW
EXECUTE FUNCTION update_survey_templates_modified();
