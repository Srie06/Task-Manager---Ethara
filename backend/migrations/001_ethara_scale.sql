-- Ethara-scale schema upgrades (additive; safe to run on existing DB).
-- PostgreSQL assumes default CHECK constraint names users_role_check and tasks_status_check.
-- If your DB used different constraint names, find them via:
--   SELECT conname FROM pg_constraint WHERE conrelid = 'users'::regclass;

-- Rubrics table (referenced by projects.rubric_id)
CREATE TABLE IF NOT EXISTS rubrics (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  version VARCHAR(20),
  factuality_guide TEXT,
  helpfulness_guide TEXT,
  safety_guide TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Users: hierarchy + profiling
ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS calibration_score DOUBLE PRECISION DEFAULT 100.0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS domain_expertise VARCHAR(100);

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'pl', 'qr', 'tasker', 'member'));

-- Projects: rubric link
ALTER TABLE projects ADD COLUMN IF NOT EXISTS rubric_id INTEGER REFERENCES rubrics(id);

-- Tasks: pairwise review workflow + scoring
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS prompt TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS response_a TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS response_b TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS factuality_score DOUBLE PRECISION CHECK (factuality_score IS NULL OR (factuality_score BETWEEN 1 AND 7));
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS helpfulness_score DOUBLE PRECISION CHECK (helpfulness_score IS NULL OR (helpfulness_score BETWEEN 1 AND 7));
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS safety_score DOUBLE PRECISION CHECK (safety_score IS NULL OR (safety_score BETWEEN 1 AND 7));
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS rationale TEXT;

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
  CHECK (status IN (
    'todo', 'in_progress', 'review', 'done',
    'submitted', 'qr_review', 'approved', 'rejected'
  ));
