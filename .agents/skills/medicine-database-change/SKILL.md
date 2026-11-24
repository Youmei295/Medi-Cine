---
name: medicine-database-change
description: Thiết kế hoặc triển khai thay đổi mô hình lưu trữ, migration, backfill, ràng buộc hoặc giao dịch cho Medi-Cine, nhất là dữ liệu ghế, booking, thanh toán và vé.
---

# Thay đổi cơ sở dữ liệu Medi-Cine

1. Tìm stack, migration và đường đọc/ghi trên nhánh hiện tại. Nếu checkout chưa có lớp lưu trữ, mô tả mô hình, ràng buộc và kế hoạch kiểm thử bằng thuật ngữ trung lập với hệ quản trị.
2. Đọc phần liên quan trong [STATE_AND_EVENTS.md](../../../docs/api/STATE_AND_EVENTS.md). Chỉ rõ dữ liệu có thẩm quyền, ranh giới giao dịch và cách xử lý retry. Với luồng đặt vé, kiểm tra các bất biến liên quan như một lượt giữ tạo tối đa một booking, một ghế chỉ được bán một lần trong mỗi suất, một vé cho mỗi ghế của booking và một lượt soát vé cho mỗi vé.
3. Khi có migration thực thi được, thử cả khởi tạo và nâng cấp dữ liệu mẫu hiện có. Với backfill hoặc chuyển đổi không tương thích, mô tả thứ tự cập nhật ứng dụng và dữ liệu, cách tiếp tục sau lỗi và phương án khôi phục khả thi. Nếu thêm ràng buộc duy nhất, kiểm tra dữ liệu trùng trước khi bật ràng buộc.
4. Kiểm tra cạnh tranh tại điểm ghi liên quan. Ví dụ, cho hai phiên giữ cùng ghế hoặc cho thanh toán và hết hạn tranh chấp, rồi kiểm tra trạng thái được lưu. Dùng [tiêu chí kiểm tra](../../context/quality-gates.md) để ghi kết quả và điều kiện còn thiếu.
