CREATE TABLE notifications (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  type VARCHAR(40) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT NULL,
  data JSON NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY ix_notifications_user_read_created (user_id, is_read, created_at),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
