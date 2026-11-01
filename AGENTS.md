# AGENTS.md — LMS-P

Hướng dẫn cho mọi AI agent làm việc trong repo. Nguồn chân lý nghiệp vụ: `CLAUDE.md` và `docs/`.

- Spec-first: đọc `docs/srs.md` + `docs/system-architecture.md`; đổi yêu cầu/hành vi thì cập nhật spec trước.
- DB: chỉ dùng JPA entities và Flyway migrations. Cấm sửa schema trực tiếp trong MySQL.
- Backend: Spring Boot tại `apps/api`; package theo `common`, `config`, `controller`, `dto`, `enums`, `feature`, `mapper`, `model`, `repository`, `security`, `service`.
- Worker: Spring Boot consumer tách riêng ở `apps/worker`.
- Frontend: React + TypeScript SPA tại `apps/web`; chia theo feature, component dùng chung đặt ở `components/`.
- File code < 200 dòng, kebab-case cho TS; Java dùng PascalCase cho class và camelCase cho method.
- Git: conventional commits, feature branch + PR + review, không commit secret/`.env`/storage.
- UI tiếng Việt; thiết kế tokens → components → pages, tránh template chung chung.
- Xong việc phải chạy compile/build/test thật nếu runtime có sẵn.

Stack: React + TypeScript + Vite · Java 21 + Spring Boot · Spring Data JPA + Flyway · MySQL 8.4 · RabbitMQ/Spring AMQP · Docker sandbox · JWT + BCrypt/Argon2.
