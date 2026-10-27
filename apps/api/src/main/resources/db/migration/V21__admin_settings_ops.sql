-- Cấu hình hệ thống, thông báo hệ thống, phiên đăng nhập, mốc thông báo kỳ thi (docs/admin-spec.md)

CREATE TABLE system_settings (
  setting_key VARCHAR(60) NOT NULL PRIMARY KEY,
  setting_value JSON NOT NULL,
  updated_by BIGINT NULL,
  updated_at DATETIME NOT NULL,
  CONSTRAINT fk_system_settings_user FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE announcements (
  id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  audience VARCHAR(10) NOT NULL,
  role VARCHAR(20) NULL,
  class_id BIGINT NULL,
  recipient_count INT UNSIGNED NOT NULL,
  created_by BIGINT NOT NULL,
  created_at DATETIME NOT NULL,
  KEY ix_announcements_created (created_at),
  CONSTRAINT chk_announcements_audience CHECK (audience IN ('all', 'role', 'class')),
  CONSTRAINT fk_announcements_class FOREIGN KEY (class_id) REFERENCES classes(id),
  CONSTRAINT fk_announcements_creator FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

ALTER TABLE refresh_tokens
  ADD COLUMN session_family CHAR(36) NULL AFTER token_hash,
  ADD COLUMN ip VARCHAR(45) NULL AFTER session_family,
  ADD COLUMN user_agent VARCHAR(255) NULL AFTER ip,
  ADD COLUMN last_used_at DATETIME NULL AFTER created_at;

-- Token cũ: mỗi token là một phiên riêng
UPDATE refresh_tokens SET session_family = UUID() WHERE session_family IS NULL;
ALTER TABLE refresh_tokens
  MODIFY COLUMN session_family CHAR(36) NOT NULL,
  ADD KEY ix_refresh_tokens_family (user_id, session_family);

ALTER TABLE assignments
  ADD COLUMN upcoming_notified_at DATETIME NULL,
  ADD COLUMN results_notified_at DATETIME NULL;

-- Bài đã mở / đã đóng trước khi có tính năng: không gửi bù thông báo
UPDATE assignments SET upcoming_notified_at = UTC_TIMESTAMP()
WHERE available_from IS NULL OR available_from <= UTC_TIMESTAMP() + INTERVAL 30 MINUTE;
UPDATE assignments SET results_notified_at = UTC_TIMESTAMP()
WHERE (CASE WHEN allow_late AND late_due_at IS NOT NULL THEN late_due_at ELSE due_at END) <= UTC_TIMESTAMP();
