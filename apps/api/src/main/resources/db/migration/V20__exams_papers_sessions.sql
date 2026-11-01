-- Kỳ thi, cấu trúc đề (phần, quy tắc bốc), đề/mã đề và phiên làm bài (docs/exam-spec.md)

ALTER TABLE assignments
  ADD COLUMN time_limit_minutes INT UNSIGNED NULL AFTER max_attempts,
  ADD COLUMN paper_mode VARCHAR(20) NOT NULL DEFAULT 'same' AFTER shuffle_options,
  ADD COLUMN variant_count INT UNSIGNED NULL AFTER paper_mode,
  ADD COLUMN rules_text TEXT NULL AFTER variant_count,
  ADD COLUMN paper_seed BIGINT NOT NULL DEFAULT 0 AFTER rules_text,
  ADD CONSTRAINT chk_assignments_paper_mode CHECK (paper_mode IN ('same', 'variants', 'per_student'));

UPDATE assignments SET paper_seed = CAST(CONV(SUBSTRING(SHA2(CONCAT(id, ':', created_at), 256), 1, 15), 16, 10) AS SIGNED);

CREATE TABLE assignment_sections (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  assignment_id BIGINT NOT NULL,
  position INT UNSIGNED NOT NULL,
  title VARCHAR(200) NOT NULL,
  UNIQUE KEY uq_assignment_section_position (assignment_id, position),
  CONSTRAINT fk_assignment_sections_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE assignment_draw_rules (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  assignment_id BIGINT NOT NULL,
  section_id BIGINT NULL,
  variant_no INT UNSIGNED NULL,
  position INT UNSIGNED NOT NULL,
  bank_id BIGINT NOT NULL,
  category_id BIGINT NULL,
  difficulty VARCHAR(10) NULL,
  type VARCHAR(20) NULL,
  count INT UNSIGNED NOT NULL,
  points DECIMAL(6,2) NOT NULL,
  KEY ix_draw_rules_assignment (assignment_id, position),
  CONSTRAINT fk_draw_rules_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  CONSTRAINT fk_draw_rules_section FOREIGN KEY (section_id) REFERENCES assignment_sections(id) ON DELETE CASCADE,
  CONSTRAINT fk_draw_rules_bank FOREIGN KEY (bank_id) REFERENCES question_banks(id),
  CONSTRAINT fk_draw_rules_category FOREIGN KEY (category_id) REFERENCES question_categories(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE assignment_questions
  ADD COLUMN section_id BIGINT NULL AFTER question_version_id,
  ADD COLUMN variant_no INT UNSIGNED NULL AFTER section_id,
  ADD COLUMN draw_rule_id BIGINT NULL AFTER variant_no,
  ADD CONSTRAINT fk_assignment_questions_section FOREIGN KEY (section_id) REFERENCES assignment_sections(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_assignment_questions_rule FOREIGN KEY (draw_rule_id) REFERENCES assignment_draw_rules(id) ON DELETE CASCADE;

CREATE TABLE assessment_papers (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  assignment_id BIGINT NOT NULL,
  code VARCHAR(10) NULL,
  student_id BIGINT NULL,
  total_points DECIMAL(8,2) NOT NULL,
  created_at DATETIME NOT NULL,
  UNIQUE KEY uq_assessment_paper_code (assignment_id, code),
  CONSTRAINT fk_assessment_papers_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  CONSTRAINT fk_assessment_papers_student FOREIGN KEY (student_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE paper_items (
  paper_id BIGINT NOT NULL,
  assignment_question_id BIGINT NOT NULL,
  position INT UNSIGNED NOT NULL,
  PRIMARY KEY (paper_id, assignment_question_id),
  UNIQUE KEY uq_paper_item_position (paper_id, position),
  CONSTRAINT fk_paper_items_paper FOREIGN KEY (paper_id) REFERENCES assessment_papers(id) ON DELETE CASCADE,
  CONSTRAINT fk_paper_items_question FOREIGN KEY (assignment_question_id) REFERENCES assignment_questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE attempt_sessions (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  assignment_id BIGINT NOT NULL,
  student_id BIGINT NOT NULL,
  attempt_no INT UNSIGNED NOT NULL,
  paper_id BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress',
  question_order JSON NOT NULL,
  started_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  extra_minutes INT UNSIGNED NOT NULL DEFAULT 0,
  rules_accepted_at DATETIME NULL,
  last_seen_at DATETIME NOT NULL,
  focus_lost_count INT UNSIGNED NOT NULL DEFAULT 0,
  submitted_at DATETIME NULL,
  submit_reason VARCHAR(10) NULL,
  assignment_attempt_id BIGINT NULL,
  UNIQUE KEY uq_attempt_session_no (assignment_id, student_id, attempt_no),
  UNIQUE KEY uq_attempt_session_attempt (assignment_attempt_id),
  KEY ix_attempt_sessions_sweep (status, ends_at),
  KEY ix_attempt_sessions_student (student_id),
  CONSTRAINT chk_attempt_sessions_status CHECK (status IN ('in_progress', 'submitted')),
  CONSTRAINT chk_attempt_sessions_reason CHECK (submit_reason IS NULL OR submit_reason IN ('manual', 'timeout', 'forced')),
  CONSTRAINT fk_attempt_sessions_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
  CONSTRAINT fk_attempt_sessions_student FOREIGN KEY (student_id) REFERENCES users(id),
  CONSTRAINT fk_attempt_sessions_paper FOREIGN KEY (paper_id) REFERENCES assessment_papers(id),
  CONSTRAINT fk_attempt_sessions_attempt FOREIGN KEY (assignment_attempt_id) REFERENCES assignment_attempts(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE session_answers (
  session_id BIGINT NOT NULL,
  assignment_question_id BIGINT NOT NULL,
  response JSON NULL,
  language VARCHAR(20) NULL,
  source_code MEDIUMTEXT NULL,
  updated_at DATETIME NOT NULL,
  PRIMARY KEY (session_id, assignment_question_id),
  CONSTRAINT fk_session_answers_session FOREIGN KEY (session_id) REFERENCES attempt_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_session_answers_question FOREIGN KEY (assignment_question_id) REFERENCES assignment_questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE session_events (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_id BIGINT NOT NULL,
  type VARCHAR(30) NOT NULL,
  occurred_at DATETIME NOT NULL,
  detail JSON NULL,
  KEY ix_session_events_session (session_id, occurred_at),
  CONSTRAINT fk_session_events_session FOREIGN KEY (session_id) REFERENCES attempt_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
