-- Wave 2.5: avatar + thuộc tính lớp (BR11–BR12) + lịch học theo buổi (FR-CRS-05..07)
ALTER TABLE users
  ADD COLUMN phone VARCHAR(20) NULL AFTER student_code,
  ADD COLUMN avatar_path VARCHAR(255) NULL AFTER phone;

ALTER TABLE courses
  ADD COLUMN credits TINYINT UNSIGNED NULL AFTER name;

ALTER TABLE classes
  ADD COLUMN max_students INT NULL AFTER semester,
  ADD COLUMN room VARCHAR(50) NULL AFTER max_students,
  ADD COLUMN status ENUM('active','locked') NOT NULL DEFAULT 'active' AFTER room,
  ADD COLUMN co_lecturer_id BIGINT NULL AFTER lecturer_id,
  ADD KEY ix_classes_co_lecturer (co_lecturer_id),
  ADD CONSTRAINT fk_classes_co_lecturer FOREIGN KEY (co_lecturer_id) REFERENCES users(id);

CREATE TABLE class_sessions (
  id BIGINT NOT NULL AUTO_INCREMENT,
  class_id BIGINT NOT NULL,
  session_date DATE NOT NULL,
  period_start TINYINT UNSIGNED NOT NULL,
  period_end TINYINT UNSIGNED NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room VARCHAR(50) NULL,
  mode ENUM('ly_thuyet','thuc_hanh') NOT NULL DEFAULT 'ly_thuyet',
  delivery ENUM('truc_tiep','truc_tuyen') NOT NULL DEFAULT 'truc_tiep',
  title VARCHAR(200) NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY ix_class_sessions_class_date (class_id, session_date),
  KEY ix_class_sessions_date (session_date),
  CONSTRAINT fk_class_sessions_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE materials
  ADD COLUMN session_id BIGINT NULL AFTER class_id,
  ADD KEY ix_materials_session (session_id),
  ADD CONSTRAINT fk_materials_session FOREIGN KEY (session_id) REFERENCES class_sessions(id);
