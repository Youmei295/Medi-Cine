# Bối cảnh dự án

## Nơi bắt đầu

- [AGENTS.md](../../AGENTS.md) hướng dẫn đóng góp vào kho mã.
- [docs/api/README.md](../../docs/api/README.md) giới thiệu API mục tiêu. [openapi.yaml](../../docs/api/openapi.yaml) là nguồn chuẩn cho giao diện HTTP `/api/v1`. [API_GUIDE.md](../../docs/api/API_GUIDE.md) giải thích quyền, quy ước và hành vi của từng thao tác.
- [TRACEABILITY.md](../../docs/api/TRACEABILITY.md) nối use case với thao tác, sự kiện và kiểm thử. [CONTRACT_SCENARIOS.md](../../docs/api/CONTRACT_SCENARIOS.md) mô tả dữ liệu mẫu, luồng lỗi và kết quả mong đợi.
- Các thư mục `pa/pa0/` đến `pa/pa3/` chứa sản phẩm theo mốc đồ án. [DECISIONS.md](../../docs/api/DECISIONS.md) liệt kê bốn PDF dùng làm baseline cho API rạp phim.

## Trạng thái checkout

Backend nằm trong `backend/`. [Cargo.toml](../../backend/Cargo.toml) khai báo Rust 2024, Axum, Tokio và SQLx hỗ trợ PostgreSQL. [main.rs](../../backend/src/main.rs) khởi động máy chủ Axum. `config.rs` đọc cấu hình, `db.rs` tạo pool SQLx và `http/` chứa router cùng các handler. Máy chủ có `/health` để kiểm tra tiến trình và `/ready` để kiểm tra PostgreSQL. API nghiệp vụ, migration và frontend đang chờ triển khai. `src/` ở gốc và `docs/test/` đang giữ chỗ.

Đọc [nghiệp vụ](domain.md) để xác định quy tắc miền và [tiêu chí kiểm tra](quality-gates.md) để chọn bằng chứng phù hợp với thay đổi. Dùng [mẫu giao việc](../templates/task-brief.md) khi xác định phạm vi và [mẫu bàn giao](../templates/handoff.md) khi chuyển tiếp công việc.
