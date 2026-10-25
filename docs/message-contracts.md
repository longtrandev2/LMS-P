# Hợp đồng chấm bài — RabbitMQ và WebSocket

Phiên bản 2.0 — 2026-10-25. Hợp đồng phần 1 API; worker sandbox do phần 2 triển khai.

## 1. Topology và sở hữu dữ liệu

| Mục đích | Exchange / routing key | Queue | Dead letter |
|---|---|---|---|
| Job | lms / grading.submit | q.grading (durable, priority 10) | lms.dlx → q.grading.dead |
| Kết quả worker | lms / grading.events | q.grading.events (durable) | lms.events.dlx → q.grading.events.dead |

API khai báo topology. V2 dùng queue kết quả mới để giữ nguyên queue legacy q.events/events.ws đã tồn tại. Worker mới phải publish vào grading.events; event legacy không cập nhật điểm.

API là tiến trình ghi submissions, grading_jobs, grading_results và test_results. Worker đọc code/snapshot từ DB, không sửa điểm/trạng thái trực tiếp. Code không đi qua message.

## 2. Job gửi sang worker

Publish persistent JSON, message_id = job_id, priority = 5 cho bài tập (10 dành cho kỳ thi, 1 cho run thử ở phần tiếp theo).

```json
{
  "schema_version": 2,
  "job_id": "12345678-1234-1234-1234-123456789abc",
  "submission_id": 1024,
  "question_id": 55,
  "question_version_id": 81,
  "student_id": 88,
  "language": "python",
  "grading_attempt": 1,
  "priority": 5,
  "enqueued_at": "2026-10-25T09:30:00Z"
}
```

Worker phải đối chiếu job với DB, đọc đúng question_version_id đã ghim; không đọc test case hiện tại trong ngân hàng:

```sql
SELECT j.job_id, j.attempt_no, s.id, s.source_code, s.language, s.status,
       s.question_version_id, v.snapshot, s.max_score, s.late_penalty_percent
FROM grading_jobs j
JOIN submissions s ON s.id = j.submission_id
JOIN question_versions v ON v.id = s.question_version_id
WHERE j.job_id = :job_id AND s.id = :submission_id;
```

Snapshot có programming (allowed_languages, time_limit_ms, memory_limit_mb, starter_code, solution_code) và test_cases (input, expected_output, is_public, weight, position). Worker không đưa solution mẫu vào kết quả.

API lưu bài nộp + outbox cùng transaction. Publisher dùng mandatory + correlated confirm; broker lỗi thì giữ job và retry với cùng UUID, backoff tối đa 60s. Broker có thể nhận trùng khi API crash trước khi đánh dấu published; worker phải idempotent theo job_id. Listener worker mẫu hiện autoStartup=false để không ACK mất job trước khi có sandbox.

## 3. Worker → API

### Bắt đầu chấm

```json
{
  "event": "submission.status",
  "payload": {
    "job_id": "12345678-1234-1234-1234-123456789abc",
    "submission_id": 1024,
    "status": "grading"
  }
}
```

### Kết thúc bình thường

```json
{
  "event": "submission.graded",
  "payload": {
    "job_id": "12345678-1234-1234-1234-123456789abc",
    "submission_id": 1024,
    "status": "completed",
    "compile_error": false,
    "compile_output": null,
    "duration_ms": 30,
    "test_results": [
      {"position": 1, "status": "passed", "output": "3", "time_ms": 10, "memory_kb": 1024},
      {"position": 2, "status": "wrong_answer", "output": "0", "time_ms": 20, "memory_kb": 1024}
    ]
  }
}
```

- status của từng test: passed / wrong_answer / runtime_error / timeout / memory_limit. Mỗi position trong snapshot xuất hiện đúng một lần; tối đa 200 test.
- API tự tính điểm từ trọng số và max_score/phạt muộn đã ghim; không tin điểm tổng từ worker.
- Lỗi biên dịch: status=completed, compile_error=true, compile_output là log biên dịch, test_results rỗng hoặc null; điểm 0.
- Lỗi hạ tầng sau retry giới hạn ở worker: status=failed, compile_error=false, error_message tùy chọn, không có test_results; điểm null. Worker retry tối đa 3 trước khi phát failure và đưa job lỗi vào DLQ.
- Compile output và output từng test được cắt ở 64KiB UTF-8, error_message tối đa 8KiB; event tối đa 16MiB, duration_ms tối đa 1 giờ; time_ms/memory_kb không âm.
- Không gửi input/expected/solution trong event. API lấy input/expected từ snapshot khi trả cho giảng viên.
- Không dùng user_id từ message để chọn người nhận. API xác định người nhận bằng submission.student_id.
- API khóa submission, ghi kết quả và notification cùng transaction rồi mới ACK. Event lặp và progress đến sau terminal được bỏ qua, không hạ trạng thái hay tạo notification trùng.
- Event lỗi cấu trúc/DB sẽ được retry tối đa 3 rồi đưa vào q.grading.events.dead. Sau khi sửa nguyên nhân có thể replay nguyên event với cùng job_id. Worker chỉ ACK job khi đã publish kết quả persistent và nhận publisher confirm.

## 4. WebSocket

GET /ws?token=<access_token>. JWT hợp lệ và user active mới được kết nối. Một user có thể mở nhiều tab.

```json
{"type":"submission.status","ts":1792910000000,"data":{"submission_id":1024,"status":"grading","score":null}}
```

Terminal gửi submission.status và submission.graded với submission_id, status, score, total_tests, passed_tests, compile_error. Không có dữ liệu test ẩn hoặc code trong WS.

Client gửi {"type":"ping"} mỗi 30s; server trả {"type":"pong","ts":...,"data":{}}. WS phát sau commit; offline không giữ event. Khi reconnect, client đọc GET /api/v1/submissions/{id}. Client coi REST là nguồn sự thật và không hạ trạng thái terminal.
