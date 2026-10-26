# Hợp đồng chấm bài — RabbitMQ và WebSocket

Phiên bản 4.0 — 2026-10-27. Kết quả từng test, checker, verdict OLE, run jobs. Quy tắc chấm ở `assessment-spec.md` §4–5, §7.

## 1. Topology và quyền sở hữu dữ liệu

| Mục đích | Exchange / routing key | Queue | Dead letter |
|---|---|---|---|
| Job chấm bài nộp | `lms` / `grading.submit` | `q.grading` (durable, priority 10) | `lms.dlx` → `q.grading.dead` |
| Kết quả chấm | `lms` / `grading.events` | `q.grading.events` (durable) | `lms.events.dlx` → `q.grading.events.dead` |
| Job chạy thử | `lms` / `run.submit` | `q.runs` (durable) | `lms.dlx` → `q.runs.dead` |
| Kết quả chạy thử | `lms` / `run.events` | `q.run.events` (durable) | `lms.events.dlx` → `q.run.events.dead` |

API là tiến trình duy nhất ghi `submissions`, `grading_results`, `test_results`, `run_jobs`. Worker chỉ có quyền SELECT; mọi kết quả về qua event. Code và test không đi trong job message: worker đọc từ DB.

Thứ tự triển khai khi đổi hợp đồng: API trước (đọc được cả event cũ lẫn mới), worker sau.

## 2. Job chấm bài nộp (API → worker)

Không đổi so với v3. Message JSON persistent, `message_id = job_id`, priority 5 cho bài tập.

```json
{"schema_version": 3, "job_id": "12345678-1234-1234-1234-123456789abc", "submission_id": 1024,
 "question_id": 55, "question_version_id": 81, "language": "python", "grading_attempt": 1, "priority": 5}
```

Worker đọc job, code, language và snapshot theo `job_id` + `submission_id`. Snapshot chứa test, giới hạn, `checker_mode`/`checker_epsilon` (thiếu → `token`). Không dùng lời giải mẫu để chấm. Chấm lại tạo job mới (`grading_attempt` tăng) cho cùng submission.

## 3. Kết quả chấm (worker → API)

Bắt đầu:

```json
{"event":"submission.status","payload":{"job_id":"…","submission_id":1024,"status":"grading"}}
```

Kết quả cuối:

```json
{"event":"submission.graded","payload":{
  "job_id":"…","submission_id":1024,"status":"completed","verdict":"WA",
  "compile_error":false,"compile_output":null,"error_message":null,"duration_ms":1200,
  "tests_total":10,"tests_passed":2,"failed_test":3,
  "tests":[{"position":1,"verdict":"AC","time_ms":12,"memory_kb":null,"output":"7"},
           {"position":2,"verdict":"AC","time_ms":10,"memory_kb":null,"output":"8"},
           {"position":3,"verdict":"WA","time_ms":11,"memory_kb":null,"output":"0"}]}}
```

- Verdict tổng: `AC`, `WA`, `CE`, `TLE`, `MLE`, `RE`, `OLE`; `SYSTEM_ERROR` đi với `status:"failed"`. Verdict test: `AC`, `WA`, `TLE`, `MLE`, `RE`, `OLE`.
- `tests` chỉ gồm test đã chạy (dừng ở test sai đầu tiên); `output` cắt 4 KiB. `CE`/`failed` có `tests: []`. Trường `tests*`/`failed_test` có thể vắng (event v3) → API lưu không có kết quả từng test.
- Worker luôn gửi `failed` khi không chấm được (đọc job lỗi, Docker lỗi sau retry, quá thời gian job tổng) rồi đưa job vào DLQ; không để submission kẹt `pending`. Job của submission đã ở trạng thái cuối thì ACK bỏ qua.
- API khóa submission, kiểm tra job thuộc submission và là job mới nhất, lưu `grading_results` + `test_results`, cập nhật verdict và **điểm** (`assessment-spec.md` §5), commit, rồi mới ACK và phát WS. Event trùng hoặc đến sau trạng thái cuối được bỏ qua. API không nhận điểm từ worker.

## 4. Job chạy thử (API → worker)

```json
{"schema_version": 1, "run_id": "…uuid…", "kind": "problem_check"}
```

Worker đọc `run_jobs` theo `run_id` (chỉ xử lý khi `status = pending`), lấy `payload`:

```json
{"language":"cpp","source_code":"…","time_limit_ms":1000,"memory_limit_mb":256,
 "checker_mode":"token","checker_epsilon":null,"output_limit_bytes":4096,"stop_on_failure":false,
 "tests":[{"position":1,"input":"1 2","expected_output":"3"},{"position":2,"input":"5 5","expected_output":null}]}
```

API dựng `payload` theo `kind` (`assessment-spec.md` §7). `output_limit_bytes` là giới hạn output trả về cho từng test (4096 với `problem_check`, 65536 với `draft_check`/`practice_run`); giới hạn stdout của chương trình vẫn là 64 KiB.

## 5. Kết quả chạy thử (worker → API)

```json
{"event":"run.status","payload":{"run_id":"…","status":"running"}}
{"event":"run.completed","payload":{"run_id":"…","status":"completed","verdict":"AC",
  "compile_output":null,"error_message":null,"duration_ms":900,
  "tests":[{"position":1,"verdict":"AC","time_ms":5,"output":"3"},{"position":2,"verdict":"OK","time_ms":4,"output":"10"}]}}
```

Verdict test thêm `OK` (không có expected, chạy xong không lỗi). Lỗi hạ tầng: `status:"failed"`, `verdict:"SYSTEM_ERROR"`. Event tối đa 8 MiB.

## 6. WebSocket

Kết nối `GET /ws?token=<access_token>`. JWT hợp lệ và user active mới được kết nối. Frame không chứa code hay dữ liệu test.

```json
{"type":"submission.graded","ts":1792910000000,"data":{"submission_id":1024,"status":"completed","verdict":"AC"}}
{"type":"run.completed","ts":1792910000000,"data":{"run_id":"…","status":"completed","verdict":"WA"}}
```

`submission.status`/`submission.graded` gửi chủ bài nộp; `run.*` gửi người tạo job. Client ping mỗi 30 giây. WS phát sau DB commit và không lưu event khi client offline; khi kết nối lại (`onopen`), client đọc lại các submission/run đang chờ bằng REST.
