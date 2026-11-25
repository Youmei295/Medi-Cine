# MEDI-CINE — Ghi chú database (Schema v6)

## A. Việc backend phải xử lý (không làm bằng trigger DB)

Theo mục 8 của `Agent.md` / mục 7 PDF (nhóm “Code và transaction đảm bảo”):

| Việc | Gợi ý triển khai |
|---|---|
| Giữ ghế an toàn khi đồng thời | `UPDATE showtime_seats … WHERE status = 'AVAILABLE' OR (status = 'HELD' AND held_until < now())`; khóa theo `seat_id` tăng dần trong transaction để tránh deadlock |
| Chỉ phát hành vé khi booking `PAID` | Tạo `tickets` trong cùng transaction sau khi `bookings.status = 'PAID'` |
| Callback thanh toán trùng | Chỉ `UPDATE payments SET status = 'SUCCESS' WHERE status = 'PENDING'`; nếu 0 dòng thì bỏ qua |
| Check-in một lần | `UPDATE tickets SET status = 'USED', used_at = now() WHERE status = 'VALID'` |
| Chuyển trạng thái đúng thứ tự | Job định kỳ: hết `held_until` → ghế `AVAILABLE`, item `RELEASED`, booking `EXPIRED` |
| Giới hạn mã KM | Khóa dòng `promotions` (`SELECT … FOR UPDATE`); đếm `bookings` có `promotion_id` và status `PENDING`/`PAID` so với `usage_limit` / `per_user_limit` |
| Tổng hoàn ≤ `payments.amount` | Kiểm tra trong transaction trước khi ghi `refunds` SUCCESS |
| Chọn giá từ `price_rules` | Khớp seat type + day_type + khung giờ + hiệu lực; `priority` cao nhất; hòa thì `effective_from` mới nhất; không khớp → không kích hoạt suất |
| Phân quyền theo role | Chỉ ở API (JWT + kiểm tra `users.status`) |
| Concurrency 50 lượt đặt | Test thuộc tầng ứng dụng / load test, không thuộc `sql/tests/` |

## B. Assumptions đã chọn

| Điểm | Giá trị | Lý do |
|---|---|---|
| `promotions.status` | `ACTIVE`, `INACTIVE` | PDF không liệt kê; mặc định mục 13 |
| `price_rules.day_type` | `WEEKDAY`, `WEEKEND` | Theo PDF / mục 13 |
| `email_logs.type` | CHECK 4 giá trị: `BOOKING_CONFIRMATION`, `PAYMENT_UPDATE`, `E_TICKET`, `SHOWTIME_REMINDER` | Đề xuất mục 6 + xác nhận nhóm |
| Exclusion bỏ qua suất `CANCELLED` | Có | Mục 13 + ví dụ exclusion trong agent.md |
| `price_rules.effective_to` NULL | Không giới hạn | Mục 13 |
| `usage_limit` / `per_user_limit` NULL | Không giới hạn | Mục 13 |
| `email_logs.booking_id` nullable | Có | Mục 13 (email không gắn đơn) |
| Xóa user → `refresh_tokens` | `ON DELETE RESTRICT` | User bị khóa chứ không xóa |
| Khung giờ qua nửa đêm (`price_rules`) | Không hỗ trợ; tách 2 rule | Mục 13 |
| `DEFAULT now()` cho cột thời gian tạo | `users.created_at`, `refresh_tokens.created_at`, `bookings.created_at`, `refunds.created_at`, `tickets.issued_at`, `reviews.created_at`, `audit_logs.created_at` | PDF/agent chỉ ghi NN; nhóm xác nhận dùng default. `bookings.expires_at` **không** có default |
| `rooms.format` | `VARCHAR(20)` tự do, không CHECK | Rạp có thể thêm 4DX, ScreenX… |
| Kiểu tiền / thời gian | `NUMERIC(12,2)`, `TIMESTAMPTZ` | Chi tiết hóa PDF “decimal / datetime UTC” |

## C. Đối chiếu bảng ↔ tính năng F-01 … F-14

| Bảng | Tính năng |
|---|---|
| `users`, `refresh_tokens` | F-01 Đăng ký / đăng nhập |
| `movies`, `genres`, `movie_genres` | F-02 Quản lý phim; F-06 Khám phá / lọc phim |
| `rooms`, `seat_types`, `seats` | F-03 Quản lý phòng & ghế |
| `showtimes` | F-04 Lịch chiếu |
| `price_rules` | F-05 Bảng giá |
| `showtime_seats`, `booking_items` (giữ ghế) | F-07 Chọn ghế |
| `bookings`, `booking_items`, `payments` | F-08 Đặt vé & thanh toán |
| `tickets` | F-09 E-ticket / QR |
| `ticket_scans` | F-10 Check-in tại rạp |
| `bookings`, `payments`, `refunds` | F-11 Quản lý đơn / hoàn tiền |
| `reviews` | F-12 Đánh giá phim |
| `promotions` | F-13 Mã giảm giá |
| `email_logs`, `audit_logs` | F-14 Thông báo / nhật ký hệ thống |

## D. Lệch PDF ↔ Agent.md (PDF thắng khi mâu thuẫn)

Sau khi đối chiếu `docs/database/MEDI-CINE — Tài liệu cơ sở dữ liệu (ERD).pdf` và ERD HTML:

| Chủ đề | Kết luận |
|---|---|
| 21 bảng, cột, quan hệ | Khớp giữa PDF, HTML và Agent.md — không mâu thuẫn schema |
| Đường dẫn tài liệu | Agent.md cũ ghi `docs/…`; thực tế nằm ở `docs/database/` — đã cập nhật Agent.md |
| Exclusion `btree_gist` / partial unique `booking_items` | PDF mô tả quy tắc; Agent.md chỉ rõ cách hiện thực PostgreSQL — bổ sung kỹ thuật, không lệch nội dung |
| CHECK `showtime_seats` HELD/AVAILABLE nullability | Có trong Agent.md mục 7.10; PDF mô tả ý nghĩa cột nhưng không viết CHECK — giữ theo Agent.md |
| CHECK `bookings.total_amount = subtotal - discount_amount` | Agent.md bổ sung; PDF nêu các cột nhưng không viết công thức CHECK — giữ |
| `payments.raw_response` / audit JSON | PDF nói phản hồi gốc / old_value·new_value; Agent.md chọn `JSONB` — giữ |
| Phần 9 PDF (nhiều rạp, đồ ăn, OAuth…) | Ngoài phạm vi — không tạo bảng/cột |

## E. Kết nối

- Từ máy host: `localhost:${POSTGRES_PORT}` (mặc định 5432)
- Từ container khác trên cùng compose network: host = tên service `postgres`
