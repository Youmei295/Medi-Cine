---
name: medicine-release-readiness
description: Đánh giá một bản bàn giao đồ án, bản demo, bản staging hoặc bản phát hành Medi-Cine dựa trên kết quả kiểm tra và các phụ thuộc của môi trường đích.
---

# Đánh giá mức độ sẵn sàng phát hành Medi-Cine

1. Xác định commit, phạm vi và đích bàn giao. Liệt kê use case, cấu hình, migration và tích hợp bị ảnh hưởng để chọn các kiểm tra tương ứng trong [tiêu chí kiểm tra](../../context/quality-gates.md).
2. Với bàn giao hợp đồng API, chạy trình kiểm tra tĩnh và rà những mục còn mở trong [DECISIONS.md](../../../docs/api/DECISIONS.md). Với bản chạy được, kiểm tra luồng nghiệp vụ bị ảnh hưởng trên môi trường đích hoặc môi trường tương đương. Với thay đổi luồng cốt lõi, thử đặt ghế, thanh toán và soát vé bằng dữ liệu mẫu.
3. Khi bản phát hành bật thanh toán, kiểm tra bằng chứng cho cấu hình VNPAY Sandbox của dự án, IPN đã ký và QueryDr khớp giao dịch. Với thay đổi dữ liệu, ghi tình trạng migration và phương án khôi phục. Đối chiếu các yêu cầu phi chức năng áp dụng trong [TRACEABILITY.md](../../../docs/api/TRACEABILITY.md).
4. Kết luận sẵn sàng hay còn vướng cho đích đã xác định. Ghi phiên bản, môi trường, kết quả, hạng mục chưa chạy và người phụ trách tiếp theo nếu đã biết. Dùng [mẫu bàn giao](../../templates/handoff.md) nếu cần chuyển tiếp kết quả.
