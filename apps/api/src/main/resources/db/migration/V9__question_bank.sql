CREATE TABLE questions (
  id BIGINT NOT NULL AUTO_INCREMENT,
  owner_id BIGINT NOT NULL,
  type ENUM('mcq','programming') NOT NULL,
  content TEXT NOT NULL,
  topic VARCHAR(100) NULL,
  difficulty ENUM('easy','medium','hard') NOT NULL DEFAULT 'medium',
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY ix_questions_owner_type (owner_id, type),
  KEY ix_questions_filters (type, difficulty, is_deleted),
  CONSTRAINT fk_questions_owner FOREIGN KEY (owner_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE question_versions (
  id BIGINT NOT NULL AUTO_INCREMENT,
  question_id BIGINT NOT NULL,
  version_no INT NOT NULL,
  snapshot JSON NOT NULL,
  created_by BIGINT NOT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_question_versions_no (question_id, version_no),
  CONSTRAINT fk_question_versions_question FOREIGN KEY (question_id) REFERENCES questions(id),
  CONSTRAINT fk_question_versions_actor FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE question_options (
  id BIGINT NOT NULL AUTO_INCREMENT,
  question_id BIGINT NOT NULL,
  content TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT FALSE,
  position INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY ix_question_options_question (question_id),
  CONSTRAINT fk_question_options_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE question_programming (
  question_id BIGINT NOT NULL,
  starter_code TEXT NULL,
  solution_code MEDIUMTEXT NULL,
  allowed_languages JSON NULL,
  time_limit_ms INT UNSIGNED NOT NULL DEFAULT 5000,
  memory_limit_mb INT UNSIGNED NOT NULL DEFAULT 256,
  PRIMARY KEY (question_id),
  CONSTRAINT fk_question_programming_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE test_cases (
  id BIGINT NOT NULL AUTO_INCREMENT,
  question_id BIGINT NOT NULL,
  input MEDIUMTEXT NOT NULL,
  expected_output MEDIUMTEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  weight DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  position INT UNSIGNED NOT NULL,
  PRIMARY KEY (id),
  KEY ix_test_cases_question (question_id),
  CONSTRAINT fk_test_cases_question FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
