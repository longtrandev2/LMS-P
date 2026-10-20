# CLAUDE.md — LMS-P (Môn Lập trình mạng)

LMS Client/Server: Next.js + FastAPI + MySQL + RabbitMQ. **Spec-first** — mọi thay đổi phải đối chiếu `docs/`, đổi yêu cầu thì đổi spec trước.

## Đọc trước khi làm
1. `docs/srs.md` — yêu cầu chức năng (M1–M10, BR1–BR10)
2. `docs/system-architecture.md` — kiến trúc + cấu trúc folder + sandbox
3. `docs/database-design.md` · `docs/api-spec.md` · `docs/message-contracts.md` · `docs/tech-decisions.md`
4. `docs/development-roadmap.md` — phase P0–P5

## Cấu trúc repo
```
apps/api      # FastAPI: core/ + modules/<m>/{router,service,repository,schemas,models}.py + ws/ + events/
apps/web      # Next.js App Router + TS + Tailwind + shadcn/ui + Monaco
apps/worker   # consumer aio-pika + runner sandbox + languages.py (bảng 4 ngôn ngữ)
infra/        # docker-compose.yml, nginx/
scripts/      # seed, dev utilities
docs/         # specs — nguồn chân lý
storage/      # volume học liệu (gitignored)
```

## Quy tắc bắt buộc

### Database (quan trọng nhất — nền tảng)
- Schema chỉ tồn tại qua **SQLAlchemy models + Alembic migration**. Flow dev: sửa model → `alembic revision --autogenerate -m "..."` → review migration → `alembic upgrade head`.
- **CẤM** sửa schema tay trong MySQL, cấm sửa file migration đã commit (tạo migration mới).
- Mọi thay đổi dữ liệu nhạy cảm → ghi `audit_logs` (helper `write_audit()`).

### Git
- Nhánh: đặt tên **mô tả tính năng, không mã code nội bộ** (cấm kiểu `m1-m2`): `feat/<tinh-nang-ngan>` (vd `feat/identity-and-class-management`), `fix/<loi>`, `chore/<việc>`.
- Commit conventional có scope: `feat(api):`, `feat(web):`, `feat(worker):`, `feat(infra):`, `fix(api):`, `docs:`, `refactor:`, `test:`, `chore:` — subject viết rõ ai đọc cũng hiểu, không nhắc AI.
- PR: title `type(scope): tóm tắt`, mô tả gồm What/Why + checklist (spec khớp, test pass, migration kèm theo, docs đã cập nhật) → code-review trước khi merge.
- **Không bao giờ commit**: `.env`, secret, credentials, `storage/` contents, dump DB.
- Sub-agent song song: KHÔNG chạy lệnh git (chỉ lead orchestrate commit) — tránh race git index.

### Code
- File < 200 dòng, tách module khi vượt. Tên file kebab-case.
- BE: router → service (nghiệp vụ + BR + audit) → repository (SQLAlchemy). Validate Pydantic. Error envelope đúng `api-spec.md` §1.
- FE: theo quy trình design — load skill `frontend-design` / `ui-ux-pro-max` / `web-design-guidelines` (đọc file SKILL.md trong `.claude/skills/` nếu không gọi skill được). Design tokens trước, components sau. **Không AI-slop**: cấm gradient tím-generic, dashboard template taste, emoji-menu. UI copy tiếng Việt.
- Sau khi sửa code: chạy compile/build/test trước khi báo xong (không mô phỏng, không mock để qua).

### Verify với user
- Hành động ảnh hưởng repo ngoài/PR/merge/deploy → hỏi user trước.
- Hoàn thành phase → user verify demo trước khi sang phase sau.
