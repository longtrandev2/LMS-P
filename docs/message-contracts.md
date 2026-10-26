# Hợp đồng chấm bài — RabbitMQ và WebSocket

Phiên bản 3.0 — verdict AC, không tính điểm từng test.

## 1. Topology và quyền sở hữu dữ liệu

| Mục đích | Exchange / routing key | Queue | Dead letter |
|---|---|---|---|
| Job | `lms` / `grading.submit` | `q.grading` (durable, priority 10) | `lms.dlx` → `q.grading.dead` |
| Kết quả worker | `lms` / `grading.events` | `q.grading.events` (durable) | `lms.events.dlx` → `q.grading.events.dead` |

API là tiến trình duy nhất ghi `submissions` và `grading_results`. Worker đọc code/snapshot từ DB; code và test không đi qua RabbitMQ. V1 không lưu kết quả từng test và không tính điểm.

## 2. Job API → worker

Message JSON persistent, `message_id = job_id`, priority 5 cho bài tập. Worker phải đối chiếu job và submission từ DB, chỉ đọc `question_version_id` đã ghim.

```json
{
  "schema_version": 3,
  "job_id": "12345678-1234-1234-1234-123456789abc",
  "submission_id": 1024,
  "question_id": 55,
  "question_version_id": 81,
  "language": "python",
  "grading_attempt": 1,
  "priority": 5
}
```

Worker truy vấn job, source code, language và snapshot theo `job_id` + `submission_id`; không tin các đường dẫn hay lệnh đến từ message. Snapshot chứa test cases, giới hạn thời gian/bộ nhớ và starter code. Không dùng solution mẫu để chấm.

API ghi submission + outbox trong cùng transaction. Publisher dùng mandatory + correlated confirm và retry cùng UUID. Có thể publish trùng nếu API crash trước khi đánh dấu published; consumer phải idempotent theo job_id.

## 3. Worker → API

Khi bắt đầu, worker gửi:

```json
{"event":"submission.status","payload":{"job_id":"12345678-1234-1234-1234-123456789abc","submission_id":1024,"status":"grading"}}
```

Kết quả cuối:

```json
{"event":"submission.graded","payload":{"job_id":"12345678-1234-1234-1234-123456789abc","submission_id":1024,"status":"completed","verdict":"AC","compile_error":false,"duration_ms":1200}}
```

Verdict: `AC`, `WA`, `CE`, `TLE`, `MLE`, `RE`; `SYSTEM_ERROR` dành cho lỗi hạ tầng sau retry. `completed` chỉ nói lượt chấm chạy xong, còn `AC` mới nói tất cả test đạt. `failed`/`SYSTEM_ERROR` không phải lỗi của code sinh viên.

- Worker chạy từng test từ snapshot, nhưng chỉ gửi verdict tổng và log lỗi biên dịch/hệ thống đã giới hạn kích thước. Không gửi input, expected output, output test hay test ẩn.
- API khóa submission, kiểm tra job thuộc submission và trạng thái, lưu grading_result + verdict trong transaction, rồi mới ACK event và phát WS sau commit.
- Worker chỉ ACK job sau khi event cuối đã được publish persistent và nhận publisher confirm. Lỗi hạ tầng retry giới hạn; hết retry thì gửi `failed`/`SYSTEM_ERROR` và đưa job vào DLQ.
- Event trùng hoặc progress đến sau trạng thái cuối được bỏ qua. API không nhận score từ worker; `score` giữ NULL trong v1.

## 4. WebSocket

Kết nối `GET /ws?token=<access_token>`. JWT hợp lệ và user active mới được kết nối. Frame status/result chỉ chứa `submission_id`, `status`, `verdict` và thời gian; không có code hoặc dữ liệu test.

```json
{"type":"submission.graded","ts":1792910000000,"data":{"submission_id":1024,"status":"completed","verdict":"AC"}}
```

Client ping mỗi 30 giây. WS phát sau DB commit và không lưu event khi client offline; khi reconnect, client đọc lại `GET /api/v1/submissions/{id}`.
