ALTER TABLE question_banks
  DROP INDEX uq_question_banks_course,
  ADD COLUMN visibility VARCHAR(16) NOT NULL DEFAULT 'private' AFTER description,
  ADD KEY ix_question_banks_course (course_id);

UPDATE question_banks SET visibility = 'shared' WHERE course_id IS NOT NULL;

ALTER TABLE question_banks ADD CONSTRAINT chk_question_bank_visibility CHECK (visibility IN ('private', 'shared'));

CREATE TABLE question_bank_permissions (
  bank_id BIGINT NOT NULL,
  lecturer_id BIGINT NOT NULL,
  permission ENUM('view','edit') NOT NULL,
  granted_at DATETIME NOT NULL,
  PRIMARY KEY (bank_id, lecturer_id),
  KEY ix_question_bank_permissions_lecturer (lecturer_id),
  CONSTRAINT fk_bank_permissions_bank FOREIGN KEY (bank_id) REFERENCES question_banks(id) ON DELETE CASCADE,
  CONSTRAINT fk_bank_permissions_lecturer FOREIGN KEY (lecturer_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Preserve edit access for lecturers who already managed the course-wide bank.
INSERT INTO question_bank_permissions (bank_id, lecturer_id, permission, granted_at)
SELECT DISTINCT b.id, c.lecturer_id, 'edit', UTC_TIMESTAMP()
FROM question_banks b
JOIN classes c ON c.course_id = b.course_id
WHERE b.course_id IS NOT NULL AND c.lecturer_id <> b.owner_id;
