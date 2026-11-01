ALTER TABLE submissions
  ADD COLUMN max_score DECIMAL(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN late_penalty_percent INT UNSIGNED NOT NULL DEFAULT 0;
UPDATE submissions s
JOIN assignment_questions q ON q.assignment_id = s.assignment_id AND q.question_id = s.question_id
JOIN assignments a ON a.id = s.assignment_id
SET s.max_score = q.points,
    s.late_penalty_percent = CASE WHEN s.is_late THEN a.late_penalty_percent ELSE 0 END;

CREATE TABLE grading_jobs (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  job_id CHAR(36) NOT NULL,
  submission_id BIGINT NOT NULL,
  attempt_no INT NOT NULL,
  priority INT NOT NULL,
  created_at DATETIME(6) NOT NULL,
  next_attempt_at DATETIME(6) NOT NULL,
  published_at DATETIME(6) NULL,
  publish_attempts INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_grading_job_uuid (job_id),
  UNIQUE KEY uq_grading_job_attempt (submission_id, attempt_no),
  KEY ix_grading_outbox_pending (published_at, next_attempt_at),
  CONSTRAINT fk_grading_job_submission FOREIGN KEY (submission_id) REFERENCES submissions(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE grading_results (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  submission_id BIGINT NOT NULL,
  grading_job_id BIGINT NOT NULL,
  attempt_no INT NOT NULL,
  status VARCHAR(20) NOT NULL,
  total_score DECIMAL(8,2) NULL,
  compile_error BOOLEAN NOT NULL,
  compile_output MEDIUMTEXT NULL,
  error_message TEXT NULL,
  graded_at DATETIME(6) NOT NULL,
  duration_ms INT NOT NULL,
  UNIQUE KEY uq_grading_result_job (grading_job_id),
  UNIQUE KEY uq_grading_result_attempt (submission_id, attempt_no),
  CONSTRAINT fk_grading_result_submission FOREIGN KEY (submission_id) REFERENCES submissions(id),
  CONSTRAINT fk_grading_result_job FOREIGN KEY (grading_job_id) REFERENCES grading_jobs(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE test_results (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  grading_result_id BIGINT NOT NULL,
  test_case_position INT NOT NULL,
  status ENUM('passed','wrong_answer','runtime_error','timeout','memory_limit') NOT NULL,
  output MEDIUMTEXT NULL,
  time_ms INT NOT NULL,
  memory_kb INT NULL,
  score DECIMAL(8,2) NOT NULL,
  UNIQUE KEY uq_test_result_position (grading_result_id, test_case_position),
  CONSTRAINT fk_test_result_grading FOREIGN KEY (grading_result_id) REFERENCES grading_results(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
