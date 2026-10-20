# Thiết kế CSDL — LMS (MySQL 8)

| | |
|---|---|
| Phiên bản | 1.0 — 2026-10-20 |
| Nguồn yêu cầu | `srs.md` (M1–M10, BR1–BR10) |
| Công nghệ | MySQL 8.4, InnoDB, utf8mb4, SQLAlchemy 2 + Alembic migration |

Quy ước: PK `id BIGINT AUTO_INCREMENT`; timestamps `DATETIME` (UTC, app-level); soft-delete chỉ cho `questions` (tái sử dụng); user không xóa cứng (dùng `status='locked'`). FK mặc định `RESTRICT`.

## 1. ERD (tổng quan)

```mermaid
erDiagram
    users ||--o{ user_roles : ""
    roles ||--o{ user_roles : ""
    users ||--o{ refresh_tokens : ""
    courses ||--o{ classes : ""
    users ||--o{ classes : "lecturer"
    classes ||--o{ enrollments : ""
    users ||--o{ enrollments : "student"
    classes ||--o{ materials : ""
    users ||--o{ questions : "owner"
    questions ||--o{ question_options : "mcq"
    questions ||--o| question_programming : "code"
    questions ||--o{ test_cases : ""
    classes ||--o{ assignments : ""
    assignments ||--o{ assignment_questions : ""
    questions ||--o{ assignment_questions : ""
    classes ||--o{ exams : ""
    exams ||--o{ exam_questions : ""
    questions ||--o{ exam_questions : ""
    exams ||--o{ exam_sessions : ""
    users ||--o{ exam_sessions : "student"
    exam_sessions ||--o{ exam_answers : ""
    exam_sessions ||--o{ exam_events : ""
    users ||--o{ submissions : "student"
    assignments ||--o{ submissions : ""
    exam_sessions ||--o{ submissions : ""
    questions ||--o{ submissions : ""
    submissions ||--o{ grading_results : ""
    grading_results ||--o{ test_results : ""
    classes ||--o{ grade_adjustments : ""
    users ||--o{ grade_adjustments : "student"
    users ||--o{ notifications : ""
    users ||--o{ audit_logs : "actor"
```

## 2. Bảng chi tiết

### 2.1 Danh tính (M1)

**users**
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT PK AI | |
| email | VARCHAR(255) UNIQUE | NOT NULL |
| password_hash | VARCHAR(255) | argon2id |
| full_name | NVARCHAR(150) | |
| student_code | VARCHAR(20) UNIQUE NULL | sinh viên |
| status | ENUM('active','locked') | default active |
| last_login_at | DATETIME NULL | |
| created_at / updated_at | DATETIME | |

**roles** — id TINYINT PK, name VARCHAR(30) UNIQUE ('student','lecturer','admin'), description. Seed 3 dòng.
**user_roles** — PK(user_id, student FK → users/roles).
**refresh_tokens** — id PK, user_id FK, token_hash CHAR(64) UNIQUE (SHA-256 của token), expires_at, revoked_at NULL, created_at. Index (user_id).

### 2.2 Khóa học & lớp (M2)

**courses** — id, code VARCHAR(20) UNIQUE, name NVARCHAR(200), description TEXT, created_by FK users, created_at.
**classes** — id, course_id FK, code VARCHAR(30), name NVARCHAR(200), semester VARCHAR(20) (vd '2026.1'), lecturer_id FK users, grade_policy JSON NULL (`{"quiz":0.2,"assignment":0.3,"midterm":0.2,"final":0.3}`), created_at. UNIQUE(course_id, code).
**enrollments** — id, class_id FK, student_id FK, status ENUM('active','dropped') default active, enrolled_at. UNIQUE(class_id, student_id); index (student_id).

### 2.3 Học liệu (M3)

**materials** — id, class_id FK, title NVARCHAR(200), description TEXT NULL, type ENUM('pdf','doc','slide','link','video','archive','other'), file_path VARCHAR(500) NULL (link → URL), size_bytes BIGINT default 0, uploaded_by FK, created_at. Index (class_id, created_at).

### 2.4 Ngân hàng câu hỏi (M4)

**questions** — id, owner_id FK users, type ENUM('mcq','programming'), content TEXT, topic VARCHAR(100) NULL, difficulty ENUM('easy','medium','hard') default 'medium', is_deleted BOOL default 0, created_at, updated_at. Index (owner_id, type).

**question_options** — id, question_id FK, content TEXT, is_correct BOOL, position TINYINT. Index (question_id).

**question_programming** — question_id PK/FK; starter_code TEXT NULL, solution_code TEXT NULL (lecturer verify đề), allowed_languages JSON NULL (NULL = tất cả), time_limit_ms INT default 5000, memory_limit_mb INT default 256.

**test_cases** — id, question_id FK, input MEDIUMTEXT, expected_output MEDIUMTEXT, is_public BOOL default 1, weight DECIMAL(5,2) default 1.0, position SMALLINT. Index (question_id).

### 2.5 Bài tập (M5)

**assignments** — id, class_id FK, title NVARCHAR(200), description TEXT, category ENUM('quiz','assignment','midterm','final') default 'assignment', available_from DATETIME NULL, due_at DATETIME, allow_late BOOL default 0, late_due_at DATETIME NULL, late_penalty_percent TINYINT default 0, max_attempts INT NULL (NULL = không giới hạn), score_policy ENUM('best','last') default 'best', is_published BOOL default 0, created_by FK, created_at, updated_at. Index (class_id, due_at).

**assignment_questions** — id, assignment_id FK, question_id FK, points DECIMAL(6,2), position SMALLINT. UNIQUE(assignment_id, question_id).

### 2.6 Kỳ thi (M7)

**exams** — id, class_id FK, title NVARCHAR(200), rules_text TEXT, duration_minutes INT, opens_at DATETIME, closes_at DATETIME, shuffle_questions BOOL default 0, is_published BOOL default 0, created_by FK, created_at, updated_at. Index (class_id, opens_at).

**exam_questions** — id, exam_id FK, question_id FK, points DECIMAL(6,2), position SMALLINT. UNIQUE(exam_id, question_id).

**exam_sessions** — id, exam_id FK, student_id FK, started_at, ends_at (= min(started_at + duration, closes_at), server tính), status ENUM('in_progress','submitted','auto_submitted'), submitted_at NULL, ip VARCHAR(45). UNIQUE(exam_id, student_id); **index (status, ends_at)** cho sweeper auto-submit.

**exam_answers** — id, exam_session_id FK, question_id FK, selected_option_ids JSON NULL (MCQ), code_text MEDIUMTEXT NULL (draft code), updated_at. UNIQUE(exam_session_id, question_id).

**exam_events** — id, exam_session_id FK, event ENUM('start','autosave','ws_disconnect','ws_reconnect','submit','auto_submit'), detail JSON NULL, created_at. Index (exam_session_id).

### 2.7 Nộp bài & chấm (M5/M6) ⭐

**submissions** — bảng thống nhất 2 loại bài nộp (quiz + code):
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | BIGINT PK AI | |
| student_id | FK users | |
| assignment_id | FK NULL | bài thường |
| exam_session_id | FK NULL | bài thi — CHECK: ít nhất 1 trong 2 NOT NULL |
| question_id | FK questions | nộp theo từng câu |
| type | ENUM('mcq','code') | |
| selected_option_ids | JSON NULL | MCQ |
| language | VARCHAR(20) NULL | code |
| source_code | MEDIUMTEXT NULL | code (≤16MB đủ; đường mở rộng: object storage) |
| attempt_no | INT | đếm theo (assignment, student, question) |
| status | ENUM('pending','grading','completed','failed') | code; MCQ tạo xong là completed |
| score | DECIMAL(6,2) NULL | điểm câu theo thang points |
| is_late | BOOL default 0 | |
| idempotency_key | CHAR(36) UNIQUE NULL | chống nộp trùng |
| submitted_at | DATETIME | |

Index: UNIQUE(assignment_id, student_id, question_id, attempt_no); (student_id, submitted_at); (exam_session_id).

**grading_results** — id, submission_id FK, attempt_no INT (số lần chấm, regrade ++), status ENUM('graded','failed'), total_score DECIMAL(6,2), compile_output TEXT NULL, error_message TEXT NULL, graded_at, duration_ms INT. Index (submission_id).

**test_results** — id, grading_result_id FK, test_case_id FK, status ENUM('passed','wrong_answer','runtime_error','timeout','memory_limit','internal_error'), output TEXT (stdout truncate 64KB), time_ms INT, memory_kb INT NULL, score DECIMAL(6,2). Index (grading_result_id).

### 2.8 Điểm (M8)

**grade_adjustments** — id, class_id FK, student_id FK, points DECIMAL(5,2) (thang 10, âm được), reason VARCHAR(500), created_by FK, created_at. Index (class_id, student_id).

Công thức (FR-GB-02), tính từ submissions + grade_policy, KHÔNG lưu bảng riêng:
- Điểm bài = theo score_policy (best/last) các submission của student.
- Avg hạng mục = avg(điểm bài / max điểm bài) × 100 trong hạng mục.
- Tổng % = Σ avg × trọng số → thang 10 = round(pct/10, 1), cộng adjustment.

### 2.9 Thông báo / Audit / Cấu hình (M9/M10)

**notifications** — id, user_id FK, type VARCHAR(40) ('assignment.published','submission.graded','exam.published','grade.released','material.created'), title VARCHAR(200), body TEXT NULL, data JSON NULL (vd submission_id), is_read BOOL default 0, created_at. Index (user_id, is_read, created_at).

**audit_logs** — id, actor_id FK NULL (NULL = system), action VARCHAR(60) ('user.update','role.assign','grade.adjust','exam.publish','settings.update','submission.regrade'...), entity_type VARCHAR(40), entity_id BIGINT, old_value JSON, new_value JSON, ip VARCHAR(45), created_at. Index (entity_type, entity_id), (actor_id, created_at), (created_at). **Append-only.**

**system_settings** — setting_key VARCHAR(60) PK, setting_value JSON, description VARCHAR(255), updated_by FK, updated_at. Keys: `allowed_languages`, `default_time_limit_ms`, `default_memory_limit_mb`, `max_upload_mb`.

## 3. Máy trạng thái

```
Submission(code):  pending ──worker pick──▶ grading ──ok──▶ completed
                       │                      └──system error (sau retry)──▶ failed
MCQ submit:        tạo là completed (chấm đồng bộ)
ExamSession:       in_progress ──submit──▶ submitted
                       └──── hết ends_at (sweeper) ────▶ auto_submitted
```

## 4. Chiến lược hiệu năng & khối lượng

- Index nóng khớp truy vấn: gradebook đọc theo (class → assignments → submissions theo student); monitor thi đọc (exam_id, status).
- Bảng tăng nhanh: submissions, test_results, audit_logs, exam_events → chỉ giữ cột cần, output/log truncate 64KB, code MEDIUMTEXT.
- Điểm/số liệu tổng hợp: query + cache app-level ngắn (60s) nếu cần; v1 ưu tiên query thẳng, đo trước tối ưu.
- Charset utf8mb4 + collation utf8mb4_0900_ai_ci toàn hệ thống (tiếng Việt).
- Migration: Alembic, mỗi thay đổi schema phải qua migration, cấm sửa tay.
