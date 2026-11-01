# Subject
Giảng viên: # LMS – Client/Server Learning Management System

LMS is a Client/Server-based learning management system designed to support online learning, assignment submission, examinations, and automated programming assessment.

**1. Server Functions**

Manage user accounts, authentication, roles, courses, classes, and learning materials.
Create and manage assignments, question banks, examinations, schedules, and grading policies.
Receive submissions, compile and execute source code in isolated environments, run test cases, and calculate scores.
Manage concurrent exam sessions, submission queues, and distributed grading workers.
Store learning records, grades, submission histories, and audit logs.
Provide APIs and real-time notifications to connected clients.
**2. Client Functions**

Allow students to access courses, view learning materials, and track learning progress.
Provide online quizzes, programming exercises, a code editor, and assignment submission.
Display compilation errors, test results, scores, and submission status.
Support examination sessions, countdown timers, and examination rules.
Allow lecturers to manage courses, assignments, examinations, test cases, and student grades.
Provide administrators with interfaces for managing users, system settings, and activity monitoring.
**3. Communication and Architecture**

The current project decision is React + TypeScript SPA, Java Spring Boot backend, and MySQL. REST APIs handle business operations, WebSocket pushes grading progress/results only, and RabbitMQ distributes grading tasks to isolated workers. The architecture supports concurrent users, secure code execution, and future scalability. cho bản phân tích nghiệp và kiến trúc công nghệ






# LMS – Phân tích nghiệp vụ và kiến trúc công nghệ

*Hệ thống quản lý học tập Client/Server hỗ trợ học trực tuyến, nộp bài, thi và chấm điểm lập trình tự động*

## 1. Tổng quan

### 1.1 Mục tiêu hệ thống

- Số hóa toàn bộ vòng đời dạy và học: quản lý khóa học, lớp học, học liệu, bài tập, kỳ thi và điểm số.
- Tự động hóa chấm bài lập trình bằng cơ chế biên dịch, thực thi trong môi trường cô lập và chạy test case.
- Đảm bảo công bằng, an toàn và chịu tải cao trong các kỳ thi có đông thí sinh thi đồng thời.
- Lưu vết đầy đủ (lịch sử nộp bài, nhật ký kiểm toán) phục vụ khiếu nại, thống kê và đánh giá chất lượng.

### 1.2 Phạm vi

**Trong phạm vi:** quản lý người dùng và phân quyền; khóa học, lớp học, học liệu; quiz trắc nghiệm; bài tập lập trình với code editor; kỳ thi có đếm giờ; chấm tự động; sổ điểm; thông báo thời gian thực; giám sát hoạt động.

**Ngoài phạm vi (giai đoạn đầu):** thanh toán học phí, video streaming quy mô lớn, ứng dụng di động native, giám thị bằng camera/AI (có thể mở rộng sau).

### 1.3 Các bên liên quan (Actors)

| Vai trò | Mô tả | Mục tiêu chính |
| --- | --- | --- |
| Sinh viên | Người học | Học, làm bài, nộp bài, xem kết quả |
| Giảng viên | Người dạy, ra đề | Quản lý lớp, bài tập, đề thi, test case, điểm |
| Quản trị viên | Vận hành hệ thống | Quản lý người dùng, cấu hình, giám sát |
| Hệ thống chấm (Grading Worker) | Actor hệ thống | Biên dịch, chạy, chấm bài tự động |
| Hệ thống ngoài (tùy chọn) | SSO, email, SIS của trường | Đồng bộ tài khoản, gửi thông báo |

## 2. Phân tích nghiệp vụ

### 2.1 Phân rã module chức năng

| Mã | Module | Chức năng chính |
| --- | --- | --- |
| M1 | Quản lý danh tính và truy cập | Đăng ký/đăng nhập, xác thực, phân quyền RBAC, đặt lại mật khẩu, khóa tài khoản |
| M2 | Quản lý khóa học và lớp | Tạo khóa học, mở lớp, ghi danh, phân công giảng viên, lịch học |
| M3 | Học liệu | Tải lên, phân loại theo chương/bài, phiên bản, theo dõi tiến độ xem |
| M4 | Ngân hàng câu hỏi | Câu hỏi trắc nghiệm, tự luận, lập trình; gắn thẻ, độ khó, chủ đề; tái sử dụng |
| M5 | Bài tập và Quiz | Giao bài, hạn nộp, số lần nộp tối đa, chính sách nộp muộn, chính sách chấm |
| M6 | Bài tập lập trình | Đề bài, ngôn ngữ cho phép, giới hạn thời gian/bộ nhớ, test case (công khai/ẩn), trọng số |
| M7 | Kỳ thi | Lập lịch, cấu hình đề (cố định/ngẫu nhiên), phòng thi, đếm giờ, quy chế, khóa/mở bài |
| M8 | Chấm điểm tự động | Hàng đợi chấm, biên dịch, thực thi sandbox, so sánh kết quả, tính điểm, chấm lại |
| M9 | Sổ điểm và báo cáo | Điểm thành phần, công thức tính điểm tổng kết, xuất báo cáo, thống kê |
| M10 | Thông báo | Thông báo thời gian thực, email, thông báo hệ thống |
| M11 | Quản trị và giám sát | Cấu hình, nhật ký kiểm toán, giám sát tải, trạng thái worker |

### 2.2 Yêu cầu chức năng theo vai trò

**Sinh viên**

- Xem danh sách khóa học/lớp đã ghi danh, học liệu, tiến độ học tập.
- Làm quiz trực tuyến, xem kết quả và đáp án theo chính sách của giảng viên.
- Viết, chạy thử và nộp code trên code editor; xem lỗi biên dịch, kết quả từng test case (test công khai), điểm và trạng thái nộp (Đang chờ, Đang chấm, Hoàn tất, Lỗi hệ thống).
- Tham gia kỳ thi: xem quy chế, xác nhận, đồng hồ đếm ngược, tự động lưu bài, nộp bài hoặc tự động nộp khi hết giờ.
- Xem lịch sử nộp bài và sổ điểm cá nhân.

**Giảng viên**

- Quản lý khóa học, lớp, học liệu, danh sách sinh viên.
- Tạo và quản lý ngân hàng câu hỏi, bài tập, đề thi, lịch thi, chính sách chấm.
- Thiết kế test case (công khai/ẩn), trọng số, giới hạn tài nguyên; chạy thử đáp án mẫu để kiểm tra đề.
- Xem bài nộp, chấm lại, điều chỉnh điểm thủ công, phúc khảo.
- Theo dõi kỳ thi trực tiếp: số thí sinh đang online, tiến độ nộp, sự cố.
- Xuất bảng điểm và báo cáo.

**Quản trị viên**

- Quản lý người dùng, vai trò, nhập hàng loạt tài khoản.
- Cấu hình hệ thống: ngôn ngữ lập trình hỗ trợ, giới hạn tài nguyên mặc định, chính sách bảo mật.
- Giám sát hoạt động, truy vết nhật ký kiểm toán, giám sát hàng đợi và worker.

### 2.3 Quy trình nghiệp vụ chính

**Quy trình A – Nộp và chấm bài lập trình**

1. Giảng viên tạo bài tập, thêm test case, đặt hạn nộp và chính sách chấm.
2. Sinh viên viết code, có thể chạy thử với test công khai.
3. Sinh viên nộp bài, server kiểm tra quyền, hạn nộp, số lần nộp rồi lưu submission ở trạng thái Pending.
4. Server đẩy tác vụ chấm vào hàng đợi.
5. Worker nhận tác vụ, biên dịch, chạy từng test case trong sandbox, thu kết quả, thời gian, bộ nhớ.
6. Hệ thống tính điểm theo trọng số test case và trả kết quả.
7. Client nhận cập nhật thời gian thực, hiển thị kết quả; điểm được ghi vào sổ điểm.

**Quy trình B – Tổ chức kỳ thi**

1. Giảng viên tạo kỳ thi: chọn đề hoặc tập câu hỏi, thời lượng, thời điểm mở/đóng, quy chế, danh sách thí sinh.
2. Đến giờ thi, hệ thống mở phòng thi; sinh viên đăng nhập và xác nhận quy chế.
3. Server cấp phiên thi, ghi nhận thời điểm bắt đầu; đồng hồ phía client chỉ để hiển thị, thời gian chuẩn do server quyết định.
4. Bài làm được tự động lưu định kỳ; mọi sự kiện bất thường (mất kết nối, chuyển tab) được ghi nhật ký.
5. Hết giờ, server tự động đóng phiên và nộp bài; bài lập trình được đưa vào hàng đợi chấm với mức ưu tiên cao.
6. Giảng viên xem kết quả, xử lý khiếu nại và công bố điểm.

**Quy trình C – Tính điểm tổng kết**

Điểm thành phần (quiz, bài tập, thi giữa kỳ, cuối kỳ) được tổng hợp theo công thức trọng số do giảng viên cấu hình; mọi điều chỉnh thủ công đều ghi nhật ký kiểm toán kèm lý do.

### 2.4 Quy tắc nghiệp vụ chính

- **BR1:** Mỗi người dùng có một hoặc nhiều vai trò; quyền truy cập dữ liệu giới hạn theo vai trò và theo lớp học.
- **BR2:** Sinh viên chỉ xem được khóa học, bài tập, kỳ thi của lớp mình ghi danh.
- **BR3:** Số lần nộp tối đa, hạn nộp và hình phạt nộp muộn do giảng viên cấu hình trên từng bài.
- **BR4:** Test case ẩn không bao giờ được trả nội dung về client; chỉ trả trạng thái đạt/không đạt.
- **BR5:** Thời gian thi do server tính; bài nộp sau thời điểm đóng phiên bị từ chối hoặc đánh dấu muộn theo cấu hình.
- **BR6:** Điểm bài lập trình = tổng trọng số các test case đạt; các giới hạn thời gian/bộ nhớ vượt ngưỡng tính là không đạt.
- **BR7:** Mọi thay đổi điểm, đề thi, cấu hình đều phải được ghi nhật ký kiểm toán (ai, khi nào, giá trị trước/sau).
- **BR8:** Bài nộp là bất biến; chấm lại tạo kết quả mới gắn với cùng submission, giữ lịch sử.
- **BR9:** Đề thi chỉ được hiển thị cho thí sinh sau thời điểm bắt đầu phiên thi.

### 2.5 Yêu cầu phi chức năng

| Nhóm | Yêu cầu đề xuất |
| --- | --- |
| Hiệu năng | API thông thường p95 dưới 300 ms; thời gian từ nộp đến bắt đầu chấm dưới 5 giây khi hệ thống không quá tải |
| Chịu tải | Hỗ trợ tối thiểu vài nghìn người dùng đồng thời; kỳ thi hàng trăm đến hàng nghìn thí sinh nộp bài trong cùng khoảng thời gian |
| Sẵn sàng | 99,5% trở lên trong giờ học; riêng kỳ thi cần phương án dự phòng và phục hồi |
| Bảo mật | Mã hóa truyền tải TLS, băm mật khẩu, phân quyền RBAC, chống tấn công phổ biến (OWASP Top 10), sandbox thực thi mã |
| Mở rộng | Worker chấm mở rộng ngang; thêm ngôn ngữ lập trình không ảnh hưởng lõi |
| Toàn vẹn dữ liệu | Không mất bài nộp; sao lưu định kỳ, khôi phục theo RPO/RTO đã định |
| Khả năng kiểm toán | Lưu vết toàn bộ thao tác nhạy cảm |
| Tính dùng được | Giao diện responsive, hỗ trợ đa ngôn ngữ (Việt/Anh) |

### 2.6 Mô hình dữ liệu mức khái niệm

| Thực thể | Thuộc tính / quan hệ chính |
| --- | --- |
| User | id, email, mật khẩu băm, trạng thái; nhiều Role |
| Role / Permission | RBAC, gán theo User |
| Course | mã, tên, mô tả; có nhiều Class |
| Class | thuộc Course, học kỳ, giảng viên, danh sách Enrollment |
| Enrollment | liên kết User (sinh viên) và Class |
| Material | thuộc Class/Course, loại, đường dẫn lưu trữ, phiên bản |
| Question | loại (trắc nghiệm, tự luận, lập trình), độ khó, thẻ |
| Assignment | thuộc Class, hạn nộp, chính sách chấm, danh sách Question |
| TestCase | thuộc Question lập trình, input, expected output, trọng số, công khai/ẩn |
| Exam / ExamSession | lịch thi, thời lượng, đề; phiên thi của từng thí sinh |
| Submission | người nộp, bài/đề, mã nguồn, ngôn ngữ, trạng thái, thời điểm |
| GradingResult | thuộc Submission, kết quả từng test case, điểm, log biên dịch, thời gian/bộ nhớ |
| Grade | điểm thành phần và tổng kết theo sinh viên và lớp |
| AuditLog | actor, hành động, đối tượng, giá trị trước/sau, thời điểm, IP |
| Notification | người nhận, nội dung, trạng thái đã đọc |

## 3. Kiến trúc công nghệ

### 3.1 Nguyên tắc kiến trúc

- **Tách biệt mối quan tâm:** API nghiệp vụ tách khỏi hạ tầng chấm bài; không bao giờ chạy mã người dùng trong tiến trình API.
- **Bất đồng bộ cho tác vụ nặng:** chấm bài qua hàng đợi, API chỉ nhận và trả về mã theo dõi.
- **Stateless ở tầng API:** dễ mở rộng ngang phía sau load balancer.
- **Bảo mật theo chiều sâu:** xác thực, phân quyền, sandbox, giới hạn tài nguyên, kiểm toán.
- **Khởi đầu đơn giản, sẵn sàng mở rộng:** bắt đầu bằng modular monolith, tách dịch vụ khi thật sự cần.

### 3.2 Kiến trúc tổng thể

```
[Trình duyệt: React + TypeScript SPA]
        |  HTTPS (REST)        |  WSS (WebSocket)
        v                      v
[Reverse Proxy / Load Balancer (Nginx)]
        |
        +--> [API Server (Java + Spring Boot)]  <--->  [MySQL (chính + replica đọc)]
        |        |   |   
        |        |   +--> [Redis: cache, session, pub/sub, rate limit]
        |        |
        |        +--> [RabbitMQ: grading queue]
        |                     |
        |                     v
        |          [Grading Workers x N]
        |            (sandbox cô lập từng lần chạy)
        |
        +--> [WebSocket Gateway] <-- Redis pub/sub -- (trạng thái/kết quả chấm bài)
        |
        +--> [Object Storage: học liệu, test case lớn, log]
```

### 3.3 Lựa chọn công nghệ và vai trò từng thành phần

| Tầng | Công nghệ | Vai trò và ghi chú |
| --- | --- | --- |
| Frontend | React, TypeScript, Vite | SPA cho sinh viên, giảng viên, quản trị; editor Monaco; quản lý state và gọi API |
| Backend API | Java + Spring Boot | REST API, xác thực, phân quyền, logic nghiệp vụ, OpenAPI |
| Realtime | WebSocket trong Spring Boot | Đẩy trạng thái và kết quả chấm bài tới đúng người dùng |
| CSDL | MySQL 8 (InnoDB) | Dữ liệu giao dịch; replica đọc cho báo cáo; chỉ mục theo truy vấn chính |
| Hàng đợi | RabbitMQ | Phân phối tác vụ chấm; ack thủ công, retry, dead-letter queue, ưu tiên |
| Worker chấm | Java worker + Spring AMQP | Nhận tác vụ, điều phối sandbox, thu kết quả |
| Sandbox | Docker với seccomp/AppArmor, hoặc gVisor / Firecracker / isolate | Cô lập thực thi mã không tin cậy |
| Cache | Redis | Cache, rate limit, khóa phân tán, pub/sub cho WebSocket |
| Lưu trữ tệp | Object storage tương thích S3 (MinIO hoặc dịch vụ đám mây) | Học liệu, test case lớn, log chấm |
| Hạ tầng | Docker, Docker Compose (giai đoạn đầu), Kubernetes (mở rộng) | Đóng gói, triển khai, tự động co giãn worker |
| Quan sát | Prometheus, Grafana, ELK/Loki, Sentry | Metric, log tập trung, truy vết lỗi |

### 3.4 Kiến trúc Backend

Khuyến nghị **modular monolith** theo module nghiệp vụ M1–M11, mỗi module có ranh giới rõ (router, service, repository, schema). Cách này giảm độ phức tạp vận hành ban đầu và vẫn cho phép tách thành dịch vụ riêng sau này (ưu tiên tách đầu tiên: dịch vụ chấm bài và dịch vụ realtime).

- **Tầng trình bày:** router REST, validate đầu vào, xử lý lỗi thống nhất.
- **Tầng nghiệp vụ:** service chứa quy tắc BR1–BR9.
- **Tầng dữ liệu:** repository, ORM (Spring Data JPA), migration (Flyway).
- **Tác vụ nền:** gửi email, tính báo cáo, dọn dẹp, chạy qua hàng đợi.
- **Hợp đồng API:** OpenAPI, phiên bản hóa (ví dụ /api/v1).

### 3.5 Giao tiếp

| Kênh | Dùng cho | Ghi chú |
| --- | --- | --- |
| REST | CRUD, nộp bài, tải học liệu, truy vấn điểm | JSON, phân trang, idempotency key khi nộp bài |
| WebSocket | Trạng thái và kết quả chấm bài | Xác thực bằng token khi bắt tay; cơ chế heartbeat và tự kết nối lại |
| RabbitMQ | Server tới worker | Tác vụ chấm; kết quả trả qua hàng đợi phản hồi hoặc API nội bộ |

Một số endpoint tiêu biểu:

| Phương thức | Đường dẫn | Mô tả |
| --- | --- | --- |
| POST | /api/v1/auth/login | Đăng nhập, cấp access/refresh token |
| GET | /api/v1/classes/{id}/assignments | Danh sách bài tập của lớp |
| POST | /api/v1/assignments/{id}/submissions | Nộp bài, trả submission\_id, trạng thái Pending |
| GET | /api/v1/submissions/{id} | Trạng thái và kết quả chấm |
| POST | /api/v1/exams/{id}/sessions | Bắt đầu phiên thi |
| PUT | /api/v1/exam-sessions/{id}/answers | Lưu nháp bài làm |
| POST | /api/v1/exam-sessions/{id}/finish | Nộp bài thi |
| GET | /api/v1/classes/{id}/gradebook | Sổ điểm của lớp |

### 3.6 Luồng chấm bài tự động

```
Sinh viên -> API: POST submission
API: kiểm tra quyền/hạn nộp -> lưu Submission(Pending) -> publish message lên RabbitMQ
API -> Sinh viên: 202 Accepted + submission_id
Worker: nhận message -> tải code + test case -> tạo sandbox
Worker: biên dịch (nếu có) -> lỗi? -> ghi Compile Error
Worker: chạy từng test case với giới hạn thời gian/bộ nhớ/đầu ra
Worker: so sánh kết quả -> tính điểm -> ghi GradingResult -> ack message
Hệ thống: publish sự kiện qua Redis -> WebSocket Gateway -> Sinh viên nhận kết quả
```

**Các cơ chế đảm bảo độ tin cậy:**

- Ack thủ công: chỉ ack sau khi kết quả đã được lưu; worker chết thì tác vụ tự được phân phối lại.
- Xử lý trùng lặp (idempotent): kết quả chấm gắn với submission\_id và attempt, chấm lại không làm hỏng dữ liệu.
- Retry có giới hạn, sau đó chuyển vào dead-letter queue để giảng viên hoặc quản trị xử lý.
- Tách hàng đợi theo mức ưu tiên: thi, bài tập thường, chấm lại; tránh bài thi bị chặn bởi tải bài tập.
- Prefetch thấp để phân phối công bằng; giới hạn số tác vụ đồng thời theo tài nguyên mỗi worker.
- Giới hạn tần suất nộp bài theo người dùng để chống lạm dụng.

### 3.7 Thực thi mã an toàn (Sandbox)

Mã của sinh viên là mã không tin cậy; đây là rủi ro bảo mật lớn nhất của hệ thống.

- **Cô lập:** mỗi lần chạy trong container hoặc sandbox riêng, dùng một lần rồi hủy; ưu tiên gVisor hoặc Firecracker khi cần mức cô lập cao hơn container thông thường.
- **Giới hạn tài nguyên:** CPU time, wall time, bộ nhớ, số tiến trình, kích thước đầu ra, dung lượng đĩa ghi.
- **Không có mạng:** tắt hoàn toàn network trong sandbox.
- **Hệ thống tệp:** chỉ đọc, thư mục làm việc tạm; không mount dữ liệu nhạy cảm; test case ẩn chỉ nằm trong sandbox trong lúc chạy.
- **Giảm đặc quyền:** chạy bằng người dùng không có quyền, bỏ capability, áp seccomp/AppArmor, chặn syscall nguy hiểm.
- **Chống tấn công:** phòng fork bomb, ghi đầu ra vô hạn, chiếm bộ nhớ, đọc file hệ thống.
- **Tách máy:** worker chạy trên các node riêng, không đặt cùng máy với CSDL hay API.
- **Ngôn ngữ hỗ trợ:** mỗi ngôn ngữ có một image runtime cố định phiên bản (ví dụ C/C++, Java, Python); cấu hình trình biên dịch và giới hạn riêng.

### 3.8 Quản lý phiên thi đồng thời

- **Thời gian chuẩn từ server:** lưu thời điểm bắt đầu và hạn kết thúc của từng phiên; client hiển thị đếm ngược và đồng bộ định kỳ qua REST.
- **Tự động lưu:** lưu nháp theo chu kỳ ngắn để tránh mất bài khi rớt mạng; cho phép tiếp tục phiên sau khi kết nối lại trong thời gian thi còn lại.
- **Tự động nộp:** tác vụ nền đóng phiên và nộp bài khi hết giờ, không phụ thuộc client.
- **Chịu tải đồng loạt:** nộp bài dồn dập cuối giờ được hấp thụ bởi hàng đợi; dự phòng thêm worker trước giờ thi (co giãn theo lịch).
- **Chống gian lận cơ bản:** ghi log sự kiện bất thường (mất focus, nhiều phiên đăng nhập), khóa đăng nhập đồng thời, phát hiện trùng mã nguồn ở bước sau.
- **Tính toàn vẹn đề:** đề chỉ được giải mã/hiển thị sau khi phiên bắt đầu; xáo trộn câu hỏi theo thí sinh nếu cấu hình.

### 3.9 Bảo mật

| Lĩnh vực | Biện pháp |
| --- | --- |
| Xác thực | JWT access token ngắn hạn kết hợp refresh token, hoặc SSO (OIDC/SAML) với hệ thống của trường; băm mật khẩu bằng Argon2/bcrypt; khóa tạm khi đăng nhập sai nhiều lần |
| Phân quyền | RBAC theo vai trò kết hợp kiểm tra phạm vi theo lớp/khóa; kiểm tra ở tầng service, không chỉ ở giao diện |
| Truyền tải | TLS toàn bộ, HSTS, WSS cho WebSocket |
| Ứng dụng | Validate đầu vào, ORM tham số hóa chống SQL Injection, chống XSS/CSRF, CORS chặt, rate limiting |
| Dữ liệu | Mã hóa dữ liệu nhạy cảm, sao lưu mã hóa, phân tách quyền CSDL theo dịch vụ |
| Sandbox | Xem mục 3.7 |
| Kiểm toán | Ghi nhật ký bất biến cho thao tác sửa điểm, đề thi, cấu hình, quản trị |
| Quyền riêng tư | Tối thiểu hóa dữ liệu cá nhân, chính sách lưu giữ và xóa dữ liệu |

### 3.10 Thiết kế dữ liệu và hiệu năng MySQL

- Chỉ mục theo các truy vấn nóng: (class\_id, user\_id), (assignment\_id, user\_id, created\_at) cho Submission, (exam\_id, user\_id) cho ExamSession.
- Bảng lớn tăng nhanh (Submission, GradingResult, AuditLog) cần chiến lược phân vùng theo thời gian hoặc lưu trữ lịch sử.
- Mã nguồn dài và log chấm lớn nên lưu ở object storage, chỉ giữ tham chiếu trong MySQL.
- Replica đọc cho báo cáo và thống kê để không ảnh hưởng giao dịch thi.
- Dùng transaction và khóa hợp lý ở các thao tác nhạy cảm (nộp bài, đóng phiên thi, cập nhật điểm).
- Cache Redis cho dữ liệu đọc nhiều: danh sách lớp, đề bài đã công bố, bảng xếp hạng.

### 3.11 Khả năng mở rộng

| Thành phần | Cách mở rộng |
| --- | --- |
| API Server | Nhiều bản sao phía sau load balancer (stateless) |
| WebSocket | Nhiều node; Redis pub/sub làm bus phát sự kiện; sticky session hoặc bộ định tuyến theo user |
| Worker | Thêm node theo độ dài hàng đợi; co giãn tự động theo metric |
| RabbitMQ | Cụm (quorum queues) khi cần HA |
| MySQL | Replica đọc, tối ưu truy vấn, về sau cân nhắc phân mảnh theo trường/học kỳ |
| Lưu trữ | Object storage mở rộng độc lập |

### 3.12 Triển khai, vận hành và quan sát

- **Môi trường:** dev, staging, production tách biệt; kiểm thử tải trước mỗi học kỳ.
- **CI/CD:** kiểm thử tự động, quét bảo mật phụ thuộc, build image, triển khai không gián đoạn (rolling).
- **Giám sát:** metric (độ dài hàng đợi, thời gian chấm, tỷ lệ lỗi, số kết nối WebSocket, tải CSDL), log tập trung, cảnh báo.
- **Sao lưu và phục hồi:** sao lưu MySQL định kỳ cùng binlog; kiểm tra phục hồi định kỳ; xác định RPO/RTO cho kỳ thi.
- **Kế hoạch ứng phó sự cố kỳ thi:** phương án kéo dài giờ thi, khôi phục phiên, chấm lại hàng loạt.

## 4. Rủi ro và biện pháp giảm thiểu

| Rủi ro | Mức độ | Biện pháp |
| --- | --- | --- |
| Thoát khỏi sandbox, chiếm quyền máy chủ | Rất cao | Cô lập đa lớp, không mạng, tách node, cập nhật runtime thường xuyên, kiểm thử xâm nhập |
| Quá tải cuối giờ thi | Cao | Hàng đợi ưu tiên, co giãn worker theo lịch, kiểm thử tải trước kỳ thi |
| Mất hoặc trùng bài nộp | Cao | Ack thủ công, idempotency, transaction, sao lưu |
| Kết quả chấm không nhất quán giữa các lần | Trung bình | Cố định image runtime, đo thời gian theo CPU time, dự phòng chấm lại |
| Gian lận khi thi | Trung bình | Log sự kiện, giới hạn phiên, trộn đề, kiểm tra trùng mã |
| Phức tạp vận hành khi tách quá sớm thành vi dịch vụ | Trung bình | Bắt đầu bằng modular monolith, chỉ tách khi có số liệu |
| Nghẽn MySQL ở bảng lịch sử lớn | Trung bình | Chỉ mục, phân vùng, lưu trữ tệp lớn ngoài CSDL, replica |

## 5. Lộ trình triển khai đề xuất

| Giai đoạn | Nội dung | Kết quả |
| --- | --- | --- |
| 1 – Nền tảng | Xác thực, RBAC, khóa học/lớp, học liệu, quản trị cơ bản | Quản lý lớp học vận hành được |
| 2 – Bài tập và quiz | Ngân hàng câu hỏi, quiz trắc nghiệm, sổ điểm | Giao và chấm bài trắc nghiệm |
| 3 – Chấm lập trình | Code editor, RabbitMQ, worker, sandbox, test case, WebSocket | Chấm tự động end-to-end |
| 4 – Kỳ thi | Phiên thi, đếm giờ, tự động lưu/nộp, hàng đợi ưu tiên, giám sát | Tổ chức thi quy mô lớp/khoa |
| 5 – Hoàn thiện và mở rộng | Báo cáo, kiểm toán nâng cao, co giãn tự động, chống gian lận, tích hợp SSO | Sẵn sàng triển khai diện rộng |

## 6. Các điểm cần xác nhận thêm

- Quy mô dự kiến: số người dùng đồng thời và số thí sinh lớn nhất trong một kỳ thi.
- Danh sách ngôn ngữ lập trình cần hỗ trợ và giới hạn tài nguyên mặc định.
- Có cần tích hợp SSO hoặc hệ thống quản lý đào tạo hiện có của trường không.
- Hình thức triển khai: máy chủ nội bộ (on-premise) hay đám mây.
- Yêu cầu giám sát thi (camera, khóa trình duyệt) có thuộc phạm vi không.
- Chính sách lưu giữ dữ liệu và yêu cầu pháp lý/quy định của nhà trường.
