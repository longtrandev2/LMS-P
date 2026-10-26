-- Assessment v2: câu hỏi đa loại, xem lại/trộn đề, checker, kết quả từng test, run jobs (docs/assessment-spec.md)

ALTER TABLE questions
  MODIFY COLUMN type ENUM('mcq','multiple_choice','true_false','short_answer','numeric',
                          'fill_blank','matching','ordering','programming') NOT NULL,
  ADD COLUMN explanation TEXT NULL AFTER content,
  ADD COLUMN scoring_mode VARCHAR(20) NOT NULL DEFAULT 'all_or_nothing' AFTER explanation,
  ADD COLUMN answer_spec JSON NULL AFTER scoring_mode;

ALTER TABLE question_programming
  ADD COLUMN starter_codes JSON NULL AFTER starter_code,
  ADD COLUMN solution_language VARCHAR(10) NULL AFTER solution_code,
  ADD COLUMN checker_mode VARCHAR(10) NOT NULL DEFAULT 'token' AFTER memory_limit_mb,
  ADD COLUMN checker_epsilon DOUBLE NULL AFTER checker_mode,
  MODIFY COLUMN time_limit_ms INT UNSIGNED NOT NULL DEFAULT 1000;

-- "Bỏ trống = mọi ngôn ngữ" không còn hợp lệ: điền rõ cả 4 ngôn ngữ cho dòng cũ.
UPDATE question_programming SET allowed_languages = JSON_ARRAY('python','c','cpp','java')
WHERE allowed_languages IS NULL OR JSON_LENGTH(allowed_languages) = 0;

ALTER TABLE test_cases
  MODIFY COLUMN is_public BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE assignments
  ADD COLUMN review_mode VARCHAR(20) NOT NULL DEFAULT 'after_close' AFTER score_policy,
  ADD COLUMN review_shows_answers BOOLEAN NOT NULL DEFAULT TRUE AFTER review_mode,
  ADD COLUMN shuffle_questions BOOLEAN NOT NULL DEFAULT FALSE AFTER review_shows_answers,
  ADD COLUMN shuffle_options BOOLEAN NOT NULL DEFAULT FALSE AFTER shuffle_questions;

ALTER TABLE submissions
  ADD COLUMN response JSON NULL AFTER selected_option_ids;

-- Điểm bài code (BR6): AC = điểm câu sau phạt muộn, verdict khác = 0, failed giữ NULL.
UPDATE submissions
SET score = CASE WHEN verdict = 'AC'
                 THEN ROUND(max_score * (100 - late_penalty_percent) / 100, 2)
                 ELSE 0 END
WHERE type = 'code' AND status = 'completed';

ALTER TABLE grading_results
  ADD COLUMN tests_total INT NULL AFTER duration_ms,
  ADD COLUMN tests_passed INT NULL AFTER tests_total,
  ADD COLUMN failed_test INT NULL AFTER tests_passed;

ALTER TABLE test_results
  MODIFY COLUMN status VARCHAR(16) NOT NULL,
  MODIFY COLUMN score DECIMAL(8,2) NOT NULL DEFAULT 0;

CREATE TABLE run_jobs (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  job_id CHAR(36) NOT NULL,
  kind VARCHAR(20) NOT NULL,
  requested_by BIGINT NOT NULL,
  question_id BIGINT NULL,
  question_version_id BIGINT NULL,
  assignment_id BIGINT NULL,
  payload JSON NOT NULL,
  status VARCHAR(16) NOT NULL,
  verdict VARCHAR(16) NULL,
  result JSON NULL,
  created_at DATETIME(6) NOT NULL,
  next_attempt_at DATETIME(6) NOT NULL,
  published_at DATETIME(6) NULL,
  publish_attempts INT NOT NULL DEFAULT 0,
  completed_at DATETIME(6) NULL,
  UNIQUE KEY uq_run_job_uuid (job_id),
  KEY ix_run_jobs_check (question_version_id, kind, created_at),
  KEY ix_run_jobs_requester (requested_by, created_at),
  KEY ix_run_jobs_outbox (published_at, next_attempt_at),
  CONSTRAINT fk_run_job_requester FOREIGN KEY (requested_by) REFERENCES users(id),
  CONSTRAINT fk_run_job_question FOREIGN KEY (question_id) REFERENCES questions(id),
  CONSTRAINT fk_run_job_version FOREIGN KEY (question_version_id) REFERENCES question_versions(id),
  CONSTRAINT fk_run_job_assignment FOREIGN KEY (assignment_id) REFERENCES assignments(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
