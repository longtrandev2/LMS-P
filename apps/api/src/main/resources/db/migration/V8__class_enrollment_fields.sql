ALTER TABLE classes
  ADD COLUMN max_students INT UNSIGNED NULL AFTER lecturer_id,
  ADD COLUMN enroll_from DATETIME NULL AFTER max_students,
  ADD COLUMN enroll_until DATETIME NULL AFTER enroll_from,
  ADD COLUMN room VARCHAR(50) NULL AFTER enroll_until,
  ADD COLUMN schedule VARCHAR(100) NULL AFTER room,
  ADD COLUMN status ENUM('active','locked') NOT NULL DEFAULT 'active' AFTER schedule,
  ADD KEY ix_classes_semester (semester),
  ADD KEY ix_classes_enroll_until (enroll_until);

ALTER TABLE enrollments
  ADD COLUMN enrolled_via ENUM('lecturer','self') NOT NULL DEFAULT 'lecturer' AFTER enrolled_at;
