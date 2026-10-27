# Thiết kế giao diện LMS-P

Đặc tả chi tiết ở `apps/web/DESIGN.md` (nguồn chân lý về giao diện). Tóm tắt:

## Hướng và màu sắc

- Bám Frappe LMS / ClassroomIO (token frappe-ui): nền trắng, sidebar xám nhạt, nút chính đen, nút phụ xám đặc, ít viền.
- Không còn nút đỏ; đỏ chỉ dùng cho lỗi/xóa.
- Xanh lá cho đạt/thành công, đỏ cho lỗi/sai/xóa, cam cho cảnh báo (quá thời gian, nộp muộn, sắp hết hạn).
- Font Inter (đóng gói cùng ứng dụng, đủ dấu tiếng Việt khi không có Internet); code và mã định danh dùng Geist Mono.
- Có chế độ sáng và tối; token ở `apps/web/src/app/design-tokens.css`.

## Bố cục

- Sidebar desktop 240px (thu gọn được) có khối workspace ở đầu; màn hình nhỏ chuyển thành menu trượt. Topbar chỉ có breadcrumb tên thật và chuông.
- Không có trang giới thiệu: `/` chuyển thẳng vào ứng dụng hoặc màn đăng nhập.
- Trang danh sách: thanh công cụ → bảng có phân trang. Trang lớp: header lớp + tab ngang (Tổng quan, Học liệu, Bài tập, Sinh viên, Kết quả).
- Trang chủ theo vai trò có khối "Sắp đến hạn" và các lớp.
- Soạn câu hỏi, soạn bài, làm quiz, workspace code, chi tiết bài nộp là trang riêng (`docs/assessment-spec.md` §8), không dùng dialog.
- Không thêm số liệu minh họa; mọi số lấy từ API.

## Khả năng truy cập

- Nhãn cho mọi trường, tên truy cập cho nút chỉ có icon, focus nhìn thấy bằng bàn phím, tương phản chữ đạt 4.5:1.
- Nội dung dài co giãn hoặc xuống dòng; thao tác không tràn khỏi viewport di động.
- Tôn trọng theme đã lưu và `prefers-reduced-motion`.
