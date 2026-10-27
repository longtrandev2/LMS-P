-- Lịch học, điểm danh, đơn xin nghỉ, sổ điểm 4 thành phần (docs/class-schedule-grades-spec.md)

ALTER TABLE courses
  ADD COLUMN credits TINYINT UNSIGNED NOT NULL DEFAULT 3 AFTER description;

-- grade_policy định dạng cũ ({"quiz":…}) không còn dùng: đưa về mặc định
UPDATE classes SET grade_policy = NULL
WHERE grade_policy IS NOT NULL AND JSON_EXTRACT(grade_policy, '$.weights') IS NULL;

CREATE TABLE class_sessions (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  class_id BIGINT NOT NULL,
  session_no INT NOT NULL,
  session_date DATE NOT NULL,
  start_period TINYINT UNSIGNED NOT NULL,
  end_period TINYINT UNSIGNED NOT NULL,
  starts_at DATETIME NOT NULL,
  ends_at DATETIME NOT NULL,
  room VARCHAR(50) NULL,
  mode ENUM('in_person','online') NOT NULL DEFAULT 'in_person',
  title VARCHAR(200) NULL,
  note TEXT NULL,
  is_cancelled BOOLEAN NOT NULL DEFAULT FALSE,
  attendance_taken_at DATETIME NULL,
  upcoming_notified_at DATETIME NULL,
  created_by BIGINT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uq_class_session_no (class_id, session_no),
  KEY ix_class_sessions_class_start (class_id, starts_at),
  KEY ix_class_sessions_start (starts_at),
  CONSTRAINT fk_class_sessions_class FOREIGN KEY (class_id) REFERENCES classes(id),
  CONSTRAINT fk_class_sessions_creator FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE materials
  ADD COLUMN session_id BIGINT NULL AFTER class_id,
  ADD CONSTRAINT fk_materials_session FOREIGN KEY (session_id) REFERENCES class_sessions(id) ON DELETE SET NULL;

CREATE TABLE attendance_records (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  session_id BIGINT NOT NULL,
  student_id BIGINT NOT NULL,
  status ENUM('present','late','excused','absent') NOT NULL,
  note VARCHAR(255) NULL,
  marked_by BIGINT NOT NULL,
  marked_at DATETIME NOT NULL,
  UNIQUE KEY uq_attendance_session_student (session_id, student_id),
  KEY ix_attendance_student (student_id),
  CONSTRAINT fk_attendance_session FOREIGN KEY (session_id) REFERENCES class_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_student FOREIGN KEY (student_id) REFERENCES users(id),
  CONSTRAINT fk_attendance_marker FOREIGN KEY (marked_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE leave_requests (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  class_id BIGINT NOT NULL,
  session_id BIGINT NOT NULL,
  student_id BIGINT NOT NULL,
  reason TEXT NOT NULL,
  evidence_path VARCHAR(500) NOT NULL,
  evidence_name VARCHAR(255) NOT NULL,
  evidence_size INT NOT NULL,
  evidence_type VARCHAR(100) NOT NULL,
  status ENUM('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
  review_note VARCHAR(500) NULL,
  reviewed_by BIGINT NULL,
  reviewed_at DATETIME NULL,
  created_at DATETIME NOT NULL,
  KEY ix_leave_class_status (class_id, status),
  KEY ix_leave_session_student (session_id, student_id),
  CONSTRAINT fk_leave_class FOREIGN KEY (class_id) REFERENCES classes(id),
  CONSTRAINT fk_leave_session FOREIGN KEY (session_id) REFERENCES class_sessions(id),
  CONSTRAINT fk_leave_student FOREIGN KEY (student_id) REFERENCES users(id),
  CONSTRAINT fk_leave_reviewer FOREIGN KEY (reviewed_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE grade_entries (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  class_id BIGINT NOT NULL,
  student_id BIGINT NOT NULL,
  component ENUM('attendance','assignment','midterm','final') NOT NULL,
  score DECIMAL(4,2) NOT NULL,
  source ENUM('manual','csv','exam') NOT NULL,
  reason VARCHAR(500) NULL,
  updated_by BIGINT NOT NULL,
  updated_at DATETIME NOT NULL,
  UNIQUE KEY uq_grade_entry (class_id, student_id, component),
  CONSTRAINT fk_grade_entry_class FOREIGN KEY (class_id) REFERENCES classes(id),
  CONSTRAINT fk_grade_entry_student FOREIGN KEY (student_id) REFERENCES users(id),
  CONSTRAINT fk_grade_entry_updater FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
