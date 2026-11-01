ALTER TABLE users
  ADD COLUMN phone VARCHAR(20) NULL AFTER student_code,
  ADD COLUMN avatar_path VARCHAR(255) NULL AFTER phone;
