# Đo tải chấm code

Đo bằng `node scripts/load-grading.mjs --workers 1,2,3 --n 30 --langs python,cpp` ngày 2026-11-04, laptop 4 nhân (Docker Desktop, API + MySQL + RabbitMQ + web cùng máy). Mỗi lượt: làm nóng 2 bài, rồi nộp **30 bài cùng lúc** (bài "tổng hai số", 3 test). Độ trễ tính từ lúc gửi request nộp tới khi client thấy kết quả (poll 300 ms); gồm thời gian chờ hàng đợi.

| Worker | Ngôn ngữ | TB (ms) | p50 | p95 | Xong hết 30 bài (ms) | Bài/phút | Chạy trong sandbox TB (ms) | Kết quả |
|---|---|---|---|---|---|---|---|---|
| 1 | Python | 26 127 | 26 264 | 44 824 | 46 125 | 39 | 1 254 | AC 30 |
| 1 | C++ | 90 255 | 91 634 | 164 628 | 170 901 | 11 | 5 415 | AC 30 |
| 2 | Python | 14 732 | 14 076 | 26 729 | 27 062 | 67 | 1 463 | AC 30 |
| 2 | C++ | 52 305 | 51 116 | 103 522 | 103 840 | 17 | 6 472 | AC 30 |
| 3 | Python | 25 172 | 25 315 | 37 052 | 37 053 | 49 | 3 148 | AC 30 |
| 3 | C++ | 41 179 | 38 751 | 72 875 | 72 880 | 25 | 6 783 | AC 30 |

### Bổ sung Java và C (cùng ngày)

Java đo trên cùng bài "tổng hai số". C đo trên bài "tổng dãy số" (`--problem sumn`, 4 test, có test 1000 số) vì bài "tổng hai số" không cho phép C, nên số C chỉ để tham khảo.

| Worker | Ngôn ngữ | TB (ms) | p50 | p95 | Xong hết 30 bài (ms) | Bài/phút | Kết quả |
|---|---|---|---|---|---|---|---|
| 1 | Java | 50 707 | 49 317 | 94 730 | 97 657 | 18 | AC 30 |
| 2 | Java | 26 593 | 27 248 | 48 365 | 48 687 | 37 | AC 30 |
| 3 | Java | 18 034 | 16 931 | 31 094 | 31 419 | 57 | AC 30 |
| 1 | C (tổng dãy) | 34 427 | 33 511 | 62 969 | 64 919 | 28 | AC 30 |
| 2 | C (tổng dãy) | 19 192 | 19 574 | 34 813 | 34 814 | 52 | AC 30 |
| 3 | C (tổng dãy) | 12 771 | 12 335 | 21 952 | 21 952 | 82 | AC 30 |

## Nhận xét

- **Python:** 1 → 2 worker tăng thông lượng ×1,7 (39 → 67 bài/phút). Lên 3 worker lại **giảm** (49 bài/phút) vì laptop 4 nhân bị tranh CPU: thời gian chạy mỗi bài trong sandbox tăng gấp đôi (1,3 s → 1,5 s → 3,1 s với 1 → 2 → 3 worker).
- **C++:** biên dịch nặng nên thông lượng thấp hơn nhiều (11 → 17 → 25 bài/phút) nhưng vẫn tăng tới 3 worker; thời gian chạy mỗi bài tăng dần (5,4 → 6,8 s) do tranh CPU.
- **Java và C tăng gần tuyến tính tới 3 worker** (Java 18 → 37 → 57, C 28 → 52 → 82 bài/phút): lượt Python 3 worker bị chậm có thể một phần do nhiễu máy lúc đo (trình duyệt, Docker Desktop); nên đo lặp lại.
- **C++ chậm nhất** (11 bài/phút với 1 worker), chậm hơn cả Java: lời giải dùng `#include <bits/stdc++.h>` nên mỗi lần biên dịch g++ tốn vài giây.
- **Không có TLE/sai oan** ở mọi cấu hình (360/360 AC) với time limit 1 s.
- Độ trễ trung bình chủ yếu là **thời gian chờ hàng đợi** khi 30 bài đến cùng lúc, không phải thời gian chấm.

## Khuyến nghị

- Máy 4 nhân: **2 worker** (bài Python/ngôn ngữ thông dịch), có thể 3 khi đề chủ yếu C/C++.
- Quy tắc chung: số worker ≈ số nhân − 1..2; tăng trước giờ thi (`docker compose up -d --scale worker=N`), theo dõi độ sâu `q.grading` và p95 trên dashboard admin.
- Số liệu là một lần đo trên laptop dùng chung (có trình duyệt, Docker Desktop); chạy lại nhiều lần để có khoảng tin cậy trước khi đưa vào báo cáo chính thức.
