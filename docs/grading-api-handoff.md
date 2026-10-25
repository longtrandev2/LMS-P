# Bàn giao phần 1 — API chấm code

## Phạm vi đã triển khai

API nhận code và kiểm tra quyền/lớp/lượt/hạn, lưu submission pending và job outbox, publish có confirm, nhận kết quả theo hợp đồng V2, lưu điểm/kết quả/notification và phát WebSocket sau commit. API không thực thi code.

Đọc [message-contracts.md](message-contracts.md) trước khi làm worker. Đọc [api-spec.md](api-spec.md) mục M6 cho request/response.

## Phần 2 cần làm

1. Thay GradingConsumer mẫu bằng bộ chạy sandbox; bật lại listener q.grading khi đã thực thi và publish kết quả thật.
2. Kết nối MySQL để SELECT job, code và snapshot; dùng các biến kết nối trong infra/.env và host mysql khi ở Compose. API giữ quyền ghi trạng thái/kết quả.
3. Xử lý idempotency job_id, manual ACK, retry lỗi hạ tầng có giới hạn, publish confirm, DLQ.
4. Sandbox không mạng, non-root, giới hạn CPU/RAM/PID/thời gian/đầu ra và filesystem chỉ đọc.
5. Publish submission.status rồi submission.graded vào exchange lms, routing grading.events. Kiểm tra schema, position và compile/system failure đúng hợp đồng.
6. Xác nhận bằng Python trước, sau đó bổ sung C/C++/Java. Run thử/regrade thuộc các bước tiếp theo.

## Kiểm tra API bằng message giả lập

Kiểm thử Java chạy khi docker compose build api worker. Stack kiểm tra riêng và scripts/check-grading-api.mjs dùng broker thật, DB thật và kết quả worker giả lập để kiểm tra contract; kết quả này không chứng minh sandbox đã hoạt động.

Trong khi chưa có phần 2, bài code thật nằm pending trong queue. Không bật consumer mẫu chỉ để queue trống: consumer cũ chỉ ACK và sẽ bỏ mất công việc.
