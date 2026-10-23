CREATE TABLE materials (
  id BIGINT NOT NULL AUTO_INCREMENT,
  class_id BIGINT NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT NULL,
  type ENUM('pdf','doc','slide','link','video','archive','other') NOT NULL,
  file_path VARCHAR(500) NULL,
  size_bytes BIGINT NOT NULL DEFAULT 0,
  uploaded_by BIGINT NOT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY ix_materials_class_created (class_id, created_at),
  CONSTRAINT fk_materials_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT,
  CONSTRAINT fk_materials_uploader FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
