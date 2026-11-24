---
name: medicine-cross-layer-change
description: Thực hiện thay đổi hành vi Medi-Cine trải qua giao diện, HTTP API, nghiệp vụ hoặc tác vụ nền. Dùng khi thay đổi một luồng đặt vé, thanh toán, soát vé hoặc quản trị có nhiều thành phần phụ thuộc.
---

# Thay đổi liên tầng Medi-Cine

1. Tìm mã use case và kịch bản trong [TRACEABILITY.md](../../../docs/api/TRACEABILITY.md). Đọc [quy tắc nghiệp vụ](../../context/domain.md) và tra [DECISIONS.md](../../../docs/api/DECISIONS.md) nếu thay đổi chạm tới chính sách hoặc cấu hình còn mở.
2. Đi theo luồng từ thao tác của người dùng tới operation ID, quyền và quyền sở hữu, quy tắc nghiệp vụ, nơi lưu dữ liệu và sự kiện phát sinh. Xác định lớp nào ra quyết định và lớp nào chỉ hiển thị kết quả. Ví dụ, trang quay về từ thanh toán hiển thị trạng thái lấy từ máy chủ, còn việc xác nhận dựa trên kết quả cổng thanh toán đã xác minh.
3. Sửa các lớp đang có và cập nhật các phần hợp đồng, ví dụ, hướng dẫn, truy vết hoặc kịch bản mà thay đổi tác động. Đối chiếu cả bên tạo và bên đọc dữ liệu khi sửa schema, trạng thái hoặc mã lỗi. Khi một luồng đang ở giai đoạn đặc tả, ghi rõ phần triển khai còn thiếu trong kết quả bàn giao.
4. Kiểm tra luồng chính và các nhánh liên quan như dữ liệu cũ, xung đột, thiếu quyền, retry hoặc trạng thái chờ. Chạy các bước áp dụng trong [tiêu chí kiểm tra](../../context/quality-gates.md) và ghi mã kịch bản cùng kết quả.
