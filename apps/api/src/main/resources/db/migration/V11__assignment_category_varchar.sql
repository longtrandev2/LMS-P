ALTER TABLE assignments
  MODIFY COLUMN category VARCHAR(20) NOT NULL DEFAULT 'assignment';

ALTER TABLE assignments
  ADD CONSTRAINT chk_assignments_category
  CHECK (category IN ('quiz', 'assignment', 'midterm', 'final'));
