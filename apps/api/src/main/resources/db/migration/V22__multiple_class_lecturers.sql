CREATE TABLE class_lecturers (
  class_id BIGINT NOT NULL,
  lecturer_id BIGINT NOT NULL,
  PRIMARY KEY (class_id, lecturer_id),
  KEY ix_class_lecturers_lecturer (lecturer_id),
  CONSTRAINT fk_class_lecturers_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  CONSTRAINT fk_class_lecturers_user FOREIGN KEY (lecturer_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO class_lecturers (class_id, lecturer_id)
SELECT id, lecturer_id FROM classes;

ALTER TABLE classes DROP FOREIGN KEY fk_classes_lecturer;
ALTER TABLE classes DROP COLUMN lecturer_id;
