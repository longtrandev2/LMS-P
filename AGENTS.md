# AGENTS.md — LMS-P

Hướng dẫn cho mọi AI agent làm việc trong repo này. **Nguốc chân lý đầy đủ: `CLAUDE.md` (root) + `docs/`.**

Tóm tắt:
- Spec-first: đọc `docs/srs.md` + `docs/system-architecture.md` trước khi code; đổi hành vi → đổi spec trước.
- DB: chỉ qua SQLAlchemy models + Alembic migration (autogenerate flow). Cấm sửa schema tay.
- Kiến trúc: modular monolith `apps/api/app/modules/<m>/{router,service,repository,schemas,models}.py`; worker `apps/worker`; chi tiết trong `docs/system-architecture.md` §4.
- File < 200 dòng, kebab-case, không over-engineering (YAGNI/KISS/DRY).
- Git: conventional commits, feature branch + PR + review, không commit secret/`.env`/storage. Agent song song không tự commit — lead lo.
- FE: quy trình design chuẩn (design tokens → components → pages), không AI-slop, tiếng Việt.
- Xong việc phải chạy được compile/build/test thật.

Stack: Next.js 15 + TS · FastAPI + SQLAlchemy 2 async + Alembic · MySQL 8 · RabbitMQ (aio-pika, consumer tự viết) · Docker sandbox · JWT + argon2.
