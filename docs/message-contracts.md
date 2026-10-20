# Hợp đồng Message — RabbitMQ + WebSocket

| | |
|---|---|
| Phiên bản | 1.0 — 2026-10-20 |
| Nguồn | `srs.md` FR-GRD-*, FR-NTF-02, FR-EXM-04 |

## 1. Topology RabbitMQ

```
exchange  lms (direct, durable)
├─ routing grading.submit ──▶ q.grading  (durable, x-max-priority=10,
│                                          x-dead-letter-exchange=lms.dlx)
└─ routing events.ws     ──▶ q.events    (durable — API consume)

exchange  lms.dlx (fanout)
└─ ──▶ q.grading.dead   (inspect + requeue thủ công)
```

- Publish: `delivery_mode=2` (persistent), `content_type=application/json`, `message_id=uuid4()`, `priority` (10=thi, 5=bài tập, 1=run thử).
- **Message nhỏ, không nhúng code**: worker tự tải submission + test case từ DB theo id → tránh message to, luôn đọc dữ liệu mới nhất.
- Worker: `prefetch=2`, manual ack **sau khi ghi kết quả vào DB**; crash giữa chừng → message unacked được redeliver, grader idempotent theo (submission_id, grading attempt).

## 2. Message schemas

### 2.1 `grading.submit` → worker

```json
{
  "submission_id": 1024,
  "question_id": 55,
  "student_id": 88,
  "language": "python",
  "priority": 5,
  "enqueued_at": "2026-11-02T09:30:00Z"
}
```

Retry: header `x-retry` (int). Worker gặp lỗi hệ thống (không phải lỗi code sinh viên): retry tối đa 3 (backoff 2s/8s/30s rồi requeue), sau đó reject không requeue → DLQ + đánh dấu submission `failed` (INTERNAL).

### 2.2 `events.ws` → API (broadcast)

```json
{
  "event": "submission.graded",
  "user_id": 88,
  "payload": { "submission_id": 1024, "status": "completed", "score": 8.5 }
}
```

API consume `q.events` → route theo `user_id` → push qua ConnectionManager tới mọi connection của user đó (nếu offline → bỏ qua; client refetch REST khi online lại).

## 3. Catalog sự kiện WebSocket (server → client)

| Event | Payload | Kích hoạt |
|---|---|---|
| `submission.status` | `{submission_id, status}` | pending→grading→completed/failed |
| `submission.graded` | `{submission_id, score, total_tests, passed_tests, compile_error?: bool}` | worker ghi xong kết quả |
| `run.completed` | `{run_id, results: [{test_case_id, status}]}` | run thử xong (chỉ test công khai) |
| `notification.new` | `{id, type, title, body, data}` | mọi notification mới |
| `exam.clock` | `{exam_session_id, remaining_seconds}` | mỗi 30s cho phiên đang mở |
| `exam.closing` | `{exam_session_id, remaining_seconds}` | còn đúng 60s — cảnh báo |
| `exam.submitted` | `{exam_session_id, auto: bool}` | nộp tay hoặc sweeper auto-submit |
| `pong` | `{}` | phản hồi `ping` của client |

Client → server: `{"type":"ping"}` mỗi 30s. Mọi event đều có `ts` (epoch ms) ở envelope chung: `{"type": <event>, "ts": 1730550000000, "data": {...}}`.

## 4. Quy tắc đáng tin cậy

1. **At-least-once** ở hàng đợi → mọi consumer/handler phải idempotent (khóa tự nhiên: submission_id, notification id, upsert theo key).
2. Ack sau persist — mất kết nối DB khi ghi → không ack → redeliver.
3. Thứ tự không đảm bảo trên nhiều worker → client luôn render theo trạng thái cao nhất (pending < grading < completed/failed), không downgrade.
4. WS là kênh **tối ưu**, không phải nguồn chân lý — mọi dữ liệu lấy được bằng REST; WS chỉ báo "có thay đổi".
