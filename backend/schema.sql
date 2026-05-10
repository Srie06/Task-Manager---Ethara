CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) DEFAULT 'tasker'
    CHECK (role IN ('admin','pl','qr','tasker')),
  parent_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  calibration_score DOUBLE PRECISION DEFAULT 100.0,
  domain_expertise VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE rubrics (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100),
  version VARCHAR(20),
  factuality_guide TEXT,
  helpfulness_guide TEXT,
  safety_guide TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  owner_id INTEGER REFERENCES users(id),
  rubric_id INTEGER REFERENCES rubrics(id),
  pl_id INTEGER REFERENCES users(id),
  completion_percent FLOAT DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','in_review','completed','archived')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE project_members (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(project_id, user_id)
);

CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  assigned_to INTEGER REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'todo'
    CHECK (status IN (
      'todo','in_progress','review','done',
      'submitted','qr_review','approved','rejected'
    )),
  priority VARCHAR(20) DEFAULT 'medium'
    CHECK (priority IN ('low','medium','high')),
  due_date DATE,
  created_by INTEGER REFERENCES users(id),
  prompt TEXT,
  response_a TEXT,
  response_b TEXT,
  reviewed_by INTEGER REFERENCES users(id),
  factuality_score DOUBLE PRECISION CHECK (factuality_score IS NULL OR (factuality_score BETWEEN 1 AND 7)),
  helpfulness_score DOUBLE PRECISION CHECK (helpfulness_score IS NULL OR (helpfulness_score BETWEEN 1 AND 7)),
  safety_score DOUBLE PRECISION CHECK (safety_score IS NULL OR (safety_score BETWEEN 1 AND 7)),
  rationale TEXT,
  pl_decision VARCHAR(20) DEFAULT 'pending' CHECK (pl_decision IN ('pending','confirmed','overridden')),
  pl_reviewed_by INTEGER REFERENCES users(id),
  pl_feedback TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
