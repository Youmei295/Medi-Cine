# Nghiệp vụ Medi-Cine

Phạm vi nghiệp vụ mục tiêu của Medi-Cine gồm tra cứu phim và suất chiếu, đặt vé, thanh toán và soát vé tại rạp. Khách hàng đặt vé và xem vé của mình. Nhân viên tra cứu và soát vé. Quản trị viên quản lý danh mục, phòng chiếu, lịch chiếu, giá và báo cáo. Quyền huỷ suất và quyền duyệt hoàn tiền được cấp và kiểm toán riêng.

## Luồng đặt vé

1. Khách chọn suất chiếu và ghế. Máy chủ giữ cả nhóm ghế hoặc từ chối cả nhóm nếu có xung đột.
2. Máy chủ tạo báo giá từ lượt giữ ghế, kiểm tra lại trước khi xác nhận và lưu giá cuối cùng cùng đơn đặt vé. Số tiền dùng đơn vị đồng Việt Nam dưới dạng số nguyên.
3. Máy chủ xác nhận kết quả thanh toán bằng IPN hoặc QueryDr đã xác minh. Trang quay về từ cổng thanh toán chỉ hiển thị trạng thái. Sau khi đơn hết hạn và ghế đã được giải phóng, khoản thu đến muộn được đưa vào đối soát.
4. Mỗi ghế đã bán có một vé. Tra cứu hoặc xem trước chỉ đọc dữ liệu. Xác nhận soát vé dùng giờ máy chủ, kiểm tra lại điều kiện và ghi nhận một lần cho mỗi vé.

## Phạm vi và nguồn

- AI gợi ý phim (UC17) và thông báo đẩy PWA (UC20) là tính năng tuỳ chọn. Luồng đặt vé, thanh toán và soát vé vẫn phải hoạt động khi chúng bị tắt.
- Dùng [nhật ký quyết định](../../docs/api/DECISIONS.md) để kiểm tra chính sách đã duyệt và cấu hình còn mở. Dùng [trạng thái và sự kiện](../../docs/api/STATE_AND_EVENTS.md) khi thay đổi quy tắc chuyển trạng thái, tranh chấp đồng thời hoặc phục hồi.
