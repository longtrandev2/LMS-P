CREATE TABLE question_banks (
  id BIGINT NOT NULL AUTO_INCREMENT,
  course_id BIGINT NULL,
  owner_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  created_by BIGINT NOT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY ix_question_banks_course (course_id),
  KEY ix_question_banks_owner (owner_id),
  CONSTRAINT fk_question_banks_course FOREIGN KEY (course_id) REFERENCES courses(id),
  CONSTRAINT fk_question_banks_owner FOREIGN KEY (owner_id) REFERENCES users(id),
  CONSTRAINT fk_question_banks_creator FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE question_categories (
  id BIGINT NOT NULL AUTO_INCREMENT,
  bank_id BIGINT NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_by BIGINT NOT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_question_categories_bank_name (bank_id, name),
  KEY ix_question_categories_creator (created_by),
  CONSTRAINT fk_question_categories_bank FOREIGN KEY (bank_id) REFERENCES question_banks(id),
  CONSTRAINT fk_question_categories_creator FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO question_banks (course_id, owner_id, name, created_by, created_at)
SELECT NULL, q.owner_id, 'Ngân hàng cá nhân', q.owner_id, UTC_TIMESTAMP()
FROM questions q
GROUP BY q.owner_id;

INSERT INTO question_categories (bank_id, name, created_by, created_at)
SELECT b.id, 'Chưa phân loại', b.owner_id, UTC_TIMESTAMP()
FROM question_banks b
WHERE b.course_id IS NULL;

ALTER TABLE questions
  ADD COLUMN category_id BIGINT NULL AFTER owner_id,
  ADD KEY ix_questions_category_filters (category_id, type, difficulty, is_deleted);

UPDATE questions q
JOIN question_banks b ON b.owner_id = q.owner_id AND b.course_id IS NULL
JOIN question_categories c ON c.bank_id = b.id AND c.name = 'Chưa phân loại'
SET q.category_id = c.id;

ALTER TABLE questions
  MODIFY COLUMN category_id BIGINT NOT NULL,
  ADD CONSTRAINT fk_questions_category FOREIGN KEY (category_id) REFERENCES question_categories(id);
