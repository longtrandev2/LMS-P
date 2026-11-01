# M6 — Chấm code theo verdict AC

## Luồng triển khai

API nhận code, kiểm tra quyền/lượt/hạn, lưu submission và outbox. Worker nhận job, đọc source + snapshot đã ghim từ MySQL, biên dịch/chạy trong sandbox Docker tách mạng, rồi publish verdict. API lưu verdict và thông báo, sau commit phát WebSocket tới chủ bài.

V1 chỉ lưu verdict tổng `AC/WA/CE/TLE/MLE/RE`; không tính điểm trọng số, không lưu dữ liệu từng test. `completed` là lượt chấm kết thúc bình thường; `AC` mới là mọi test đạt.

## Giới hạn sandbox

- Container dùng một lần cho mỗi lần biên dịch/chạy; không network, non-root, read-only rootfs, không mount socket/secret, chỉ có tmpfs/job files.
- Giới hạn CPU, memory/swap, PID, wall-clock, output và dung lượng file. Worker hủy container khi timeout hoặc hoàn tất.
- Worker là thành phần tin cậy duy nhất được gọi Docker daemon. Khi chạy production, đặt worker trên node riêng; Docker socket có quyền cao.
- Worker dùng tài khoản MySQL chỉ có quyền `SELECT`; tài khoản API giữ quyền ghi nghiệp vụ và schema.
- Ngôn ngữ v1: Python, C, C++, Java. Không cho phép cài package hay tải dependency khi chạy.
- Mã nguồn tối đa 128 KiB; mỗi trường input/output test tối đa 128 KiB, tổng dữ liệu test tối đa 1 MiB, tối đa 200 test.
- So sánh output sau khi chuẩn hóa CRLF thành LF và bỏ khoảng trắng ở hai đầu; stdout/stderr mỗi luồng giới hạn 64 KiB.

## Reliability

Consumer manual ACK + prefetch giới hạn. Job lặp phải idempotent. Worker gửi progress và event cuối persistent, đợi publisher confirm rồi mới ACK job; lỗi hệ thống retry có giới hạn, sau đó ghi `failed/SYSTEM_ERROR` và dead-letter. API ACK event sau khi transaction lưu verdict commit.

## Ngoài phạm vi hiện tại

Run thử, regrade, chấm kỳ thi, điểm từng test, leaderboard và lưu stdout từng test. Dữ liệu test ẩn không được gửi tới client.
