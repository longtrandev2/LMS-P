ALTER TABLE submissions
  ADD COLUMN verdict VARCHAR(16) NULL AFTER status;

ALTER TABLE grading_results
  ADD COLUMN verdict VARCHAR(16) NULL AFTER status;
