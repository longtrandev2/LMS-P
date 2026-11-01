# Hướng dẫn AI viết báo cáo dự án LMS-P

> Dùng file này làm brief/prompt khi yêu cầu AI đọc repository và soạn báo cáo dự án. Báo cáo phải phản ánh đúng mã nguồn và tài liệu hiện có trong repo, không sao chép đề tài của báo cáo mẫu về luyện tiếng Anh.

## 1. Thông tin dự án

- **Tên dự án:** Hệ thống quản lý học tập LMS-P (LMS Client/Server)
- **Bối cảnh:** Đồ án môn Lập trình mạng.
- **Mục tiêu:** Xây dựng nền tảng quản lý hoạt động học tập trực tuyến, hỗ trợ sinh viên, giảng viên và quản trị viên.
- **Kiến trúc:** Ứng dụng web client/server gồm frontend, backend API và worker xử lý tác vụ nền.
- **Công nghệ được mô tả trong tài liệu dự án:** React, TypeScript, Vite; Java 21, Spring Boot; MySQL; RabbitMQ; WebSocket; Docker/Docker Compose.
- **Vai trò chính:** Student, Lecturer, Admin; worker chấm bài là thành phần hệ thống.

## 2. Nguồn cần đọc trước khi viết

Làm việc từ thư mục `LMS-P`. Đọc các tài liệu sau, sau đó đối chiếu với mã nguồn hiện tại:

1. `README.md` — giới thiệu dự án, cách chạy và kịch bản demo.
2. `docs/srs.md` — mục tiêu, phạm vi và yêu cầu hệ thống.
3. `docs/system-architecture.md` — kiến trúc, giao tiếp, triển khai và các giới hạn thiết kế.
4. `docs/database-design.md` — mô hình dữ liệu.
5. `docs/api-spec.md` — hợp đồng API.
6. `docs/message-contracts.md` — hợp đồng RabbitMQ và luồng worker.
7. `docs/assessment-spec.md`, `docs/exam-spec.md`, `docs/class-schedule-grades-spec.md`, `docs/admin-spec.md` — đặc tả các nhóm nghiệp vụ tương ứng.
8. `docs/development-roadmap.md` — tiến độ, các giai đoạn và nội dung còn để sau.
9. `apps/web/README.md` và `apps/web/DESIGN.md` — chạy và thiết kế giao diện.

Tài liệu là đặc tả hoặc kế hoạch, không tự nó chứng minh một chức năng đã được triển khai. Hãy kiểm tra controller/service/entity/migration ở backend, feature/page ở frontend, worker, cấu hình và script liên quan trước khi mô tả chức năng là hoàn thành.

## 3. Quy tắc về tính chính xác

- Không bịa người dùng khảo sát, phỏng vấn, cỡ mẫu, kết quả thực nghiệm, số liệu hiệu năng, số lượng test đã chạy, hoặc đánh giá của người dùng.
- Phân loại nội dung thành **đã triển khai và kiểm chứng**, **đã triển khai nhưng chưa có bằng chứng kiểm thử**, **được đặc tả/kế hoạch**, hoặc **ngoài phạm vi**.
- Chỉ gọi một chức năng là hoàn thành khi có bằng chứng trong mã nguồn và/hoặc kết quả chạy thực tế. Nếu không thể chạy dự án, ghi rõ đây là đánh giá theo mã nguồn/tài liệu, không phải kết quả kiểm chứng runtime.
- Không trình bày kế hoạch trong roadmap như sản phẩm đã có. Ghi các phần chưa hoàn thành vào giới hạn và hướng phát triển.
- Đặc biệt, không suy diễn rằng toàn bộ luồng chấm mã trong tài liệu đã chạy thành công. Kiểm tra trạng thái thực tế của worker, runner Docker, queue và giao diện trước khi kết luận.
- Không đưa mật khẩu demo, JWT secret, thông tin trong `.env`, dữ liệu cá nhân hoặc bí mật triển khai vào báo cáo. Có thể mô tả tài khoản demo mà không nêu mật khẩu.
- Khi đưa số liệu, phải ghi nguồn và phương pháp thu thập. Không tự tạo số liệu minh họa rồi trình bày như kết quả thật.
- Dùng hình/sơ đồ lấy từ dự án hoặc tạo sơ đồ đúng theo mã và tài liệu. Ghi chú rõ nếu sơ đồ là mô hình thiết kế chứ không phải ảnh chụp hệ thống đang chạy.
- Trích dẫn tài liệu nội bộ bằng tên file/đường dẫn tương đối; trích dẫn nguồn ngoài theo chuẩn mà giảng viên yêu cầu. Không tạo nguồn tham khảo giả.

## 4. Đề cương báo cáo đề xuất

Dùng cấu trúc 5 chương phù hợp với đồ án phần mềm. Tên chương có thể điều chỉnh theo mẫu của giảng viên.

### Phần đầu

- Trang bìa theo mẫu trường/khoa
- Lời cam đoan, lời cảm ơn
- Tóm tắt tiếng Việt; abstract và từ khóa nếu yêu cầu
- Mục lục, danh mục hình/bảng, danh mục từ viết tắt

### Chương 1. Giới thiệu (khoảng 3 trang)

- Bối cảnh quản lý hoạt động học tập và vấn đề dự án giải quyết
- Mục tiêu tổng quát và mục tiêu cụ thể
- Đối tượng sử dụng và phạm vi
- Các chức năng nằm trong/ngoài phạm vi theo SRS
- Phương pháp thực hiện: phân tích yêu cầu, thiết kế, triển khai theo giai đoạn và kiểm thử
- Kết quả dự kiến/đóng góp và bố cục báo cáo

Không biến đồ án phần mềm thành nghiên cứu thực nghiệm nếu nhóm không thực hiện khảo sát hay thí nghiệm.

### Chương 2. Cơ sở lý thuyết và công nghệ (khoảng 4 trang)

- LMS và mô hình client/server
- REST API, WebSocket và giao tiếp bất đồng bộ bằng message queue
- Cơ sở dữ liệu quan hệ và quản lý phiên bản schema
- Xác thực, JWT và RBAC
- Worker và xử lý tác vụ nền
- Docker và nguyên tắc cô lập khi thực thi mã không tin cậy
- Công nghệ thực tế của dự án và lý do chọn, dựa vào tài liệu quyết định công nghệ

Chỉ trình bày khái niệm giúp giải thích thiết kế LMS-P; tránh viết thành giáo trình chung.

### Chương 3. Phân tích yêu cầu và thiết kế (khoảng 6 trang)

- Các tác nhân: sinh viên, giảng viên, quản trị viên và worker
- Yêu cầu chức năng/phi chức năng tiêu biểu
- Use case hoặc sơ đồ nghiệp vụ
- Sơ đồ kiến trúc tổng thể và trách nhiệm frontend/API/worker/database/broker
- ERD hoặc mô hình dữ liệu tiêu biểu
- Thiết kế API và giao tiếp realtime/bất đồng bộ
- Sơ đồ tuần tự cho một số luồng: đăng nhập/phân quyền; giao bài và nộp bài; chấm mã; làm bài thi/tự lưu nếu các chức năng đó đã được triển khai
- Thiết kế bảo mật, xử lý lỗi và giới hạn hệ thống

### Chương 4. Triển khai hệ thống (khoảng 5–6 trang)

- Môi trường và cấu trúc repository
- Frontend, backend, worker và cơ sở dữ liệu
- Các module thực sự có trong sản phẩm, nhóm theo vai trò/nghiệp vụ
- Mô tả một hoặc hai luồng kỹ thuật quan trọng, nhất là luồng chấm bài nếu đã kiểm chứng
- Một số giao diện tiêu biểu và ảnh chụp từ ứng dụng đang chạy
- Cách cấu hình/chạy demo ở mức cần thiết, không tiết lộ bí mật

Chọn chức năng để trình bày theo bằng chứng trong mã và trạng thái hiện tại; không cần liệt kê toàn bộ file hoặc endpoint.

### Chương 5. Kiểm thử, kết quả và thảo luận (khoảng 4–5 trang)

- Cấu hình/môi trường kiểm thử thực tế
- Phương pháp kiểm thử đã dùng: unit, API/integration, smoke hoặc kiểm thử thủ công (chỉ ghi loại đã thực hiện)
- Bảng ca kiểm thử: mã, chức năng, tiền điều kiện, bước kiểm tra, kết quả mong đợi, kết quả thực tế
- Kết quả đối chiếu yêu cầu và chức năng
- Kịch bản demo theo vai trò
- Nhận xét về độ đáp ứng, hạn chế và rủi ro còn lại

Không đưa kết quả kiểm thử chỉ dựa trên việc đọc test file; phải phân biệt test được viết với test đã chạy thành công. Chỉ báo cáo hiệu năng nếu đã đo có phương pháp và ghi lại môi trường đo.

### Kết luận và hướng phát triển (khoảng 1 trang)

Tóm tắt những gì đã đạt được dựa trên bằng chứng, các mục tiêu còn thiếu và các hướng phát triển lấy từ backlog/roadmap.

### Tài liệu tham khảo và phụ lục

- Tài liệu tham khảo theo chuẩn giảng viên yêu cầu.
- Phụ lục có thể gồm hướng dẫn cài đặt, sơ đồ khổ lớn, API tiêu biểu, bảng kiểm thử đầy đủ hoặc hướng dẫn sử dụng.
- Nếu giới hạn 30 trang tính cả phụ lục, giữ phụ lục ngắn; không chèn toàn bộ mã nguồn.

## 5. Ngân sách trang mục tiêu

Nếu **30 trang tính cả phần đầu và tài liệu tham khảo**, dùng ngân sách gần đúng:

| Phần | Trang |
|---|---:|
| Bìa, cam đoan/lời cảm ơn, tóm tắt, mục lục | 4 |
| Chương 1 | 3 |
| Chương 2 | 4 |
| Chương 3 | 6 |
| Chương 4 | 5 |
| Chương 5 | 4 |
| Kết luận | 1 |
| Tài liệu tham khảo | 2 |
| Phụ lục ngắn | 1 |
| **Tổng mục tiêu** | **30** |

Nếu quy định tính 30 trang nội dung chính và loại trừ phần đầu/phụ lục/tài liệu tham khảo, điều chỉnh theo hướng dẫn của giảng viên; tổng file sẽ dài hơn.

## 6. Prompt có thể giao cho AI

> Bạn là trợ lý biên soạn báo cáo đồ án phần mềm. Hãy đọc file `README_BAO_CAO_AI.md` này, sau đó đọc tài liệu và kiểm tra mã nguồn trong repository LMS-P. Soạn báo cáo bằng tiếng Việt với đề tài “Thiết kế và xây dựng hệ thống quản lý học tập LMS-P theo mô hình Client/Server” (có thể chỉnh tên theo yêu cầu chính thức của môn học). Mục tiêu khoảng 30 trang theo ngân sách trang trong brief. Dùng cấu trúc 5 chương: Giới thiệu; Cơ sở lý thuyết và công nghệ; Phân tích yêu cầu và thiết kế; Triển khai hệ thống; Kiểm thử, kết quả và thảo luận; tiếp theo là kết luận, tài liệu tham khảo và phụ lục nếu cần. Trước khi viết, lập bảng kiểm kê chức năng với bằng chứng ở tài liệu/mã nguồn và trạng thái đã kiểm chứng. Không bịa khảo sát, kết quả, số liệu, chức năng hay nguồn tham khảo. Phân biệt rõ tính năng đã triển khai với tính năng mới chỉ được đặc tả hoặc lên kế hoạch. Nếu không chạy được hệ thống, nói rõ giới hạn xác minh. Tuân thủ mẫu định dạng và rubric của giảng viên nếu được cung cấp; nếu chưa có, dùng định dạng báo cáo học thuật phổ biến và đánh dấu các thông tin nhóm/trường/giảng viên/ngày nộp cần người dùng bổ sung.

## 7. Thông tin cần bổ sung trước khi chốt báo cáo

- Tên trường, khoa, lớp/môn học, giảng viên hướng dẫn
- Tên và mã số thành viên nhóm
- Tên đề tài chính thức theo giảng viên
- Mẫu bìa, chuẩn trích dẫn, quy định font/lề/giãn dòng
- Ngày chốt phiên bản sản phẩm
- Kết quả chạy kiểm thử/demo và ảnh giao diện thực tế
- Các phần nhóm xác nhận đã làm, chưa làm, hoặc có thay đổi so với SRS
