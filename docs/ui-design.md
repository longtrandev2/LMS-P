# Thiết kế giao diện LMS-P

Giao diện dùng font hệ thống Segoe UI/Arial để hiển thị đầy đủ tiếng Việt mà không phụ thuộc tải font bên ngoài. Tiêu đề, nội dung và biểu mẫu dùng cùng họ sans-serif; code dùng monospace.

## Màu sắc và thành phần

- Màu chính: xanh ngọc; dùng cho hành động chính, trạng thái điều hướng đang chọn và focus.
- Chế độ sáng: nền slate nhạt, bề mặt trắng, chữ slate đậm.
- Chế độ tối: nền slate đậm, bề mặt sáng hơn nền, chữ sáng và viền rõ.
- Màu đỏ dành cho lỗi/xóa; màu xanh lá dành cho thành công.
- Token nằm trong `apps/web/src/app/design-tokens.css`; thành phần dùng token semantic qua Tailwind.
- Nhãn biểu mẫu và tiêu đề card viết kiểu câu bình thường; nút và input cao khoảng 40px, focus nhìn thấy bằng bàn phím.

## Bố cục

- Sidebar desktop rộng 256px; trên màn hình nhỏ chuyển thành menu trượt.
- Nội dung có chiều rộng tối đa 1280px, khoảng đệm đáp ứng theo màn hình.
- Ngân hàng câu hỏi: tiêu đề → chọn ngân hàng/danh mục và thao tác → tìm/lọc → danh sách câu hỏi dạng hàng → phân trang.
- Hồ sơ: cột danh tính/ảnh đại diện và cột biểu mẫu; màn hình nhỏ xếp thành một cột. Các nhóm thông tin cá nhân và bảo mật có tiêu đề và mô tả riêng.
- Không thêm số liệu minh họa vào giao diện thật; số lượng lấy từ dữ liệu API.

## Khả năng truy cập

- Duy trì nhãn cho mọi trường, tên truy cập cho nút chỉ có icon và trạng thái disabled.
- Nội dung dài phải co giãn hoặc xuống dòng; các thao tác không được tràn khỏi viewport di động.
- Giữ cả chế độ sáng và tối, tôn trọng lựa chọn theme đã lưu và reduced motion.
