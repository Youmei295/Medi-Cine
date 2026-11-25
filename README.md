# MEDI-CINE

Medi-Cine is a student project for cinema ticket booking and operations. The target workflows cover browsing movies and showtimes, reserving seats, paying through VNPAY Sandbox, retrieving e-tickets, and checking guests in at the cinema.

Hệ thống quản lý rạp chiếu phim và đặt vé trực tuyến (Group 04). Schema database v6: 21 bảng, PostgreSQL 16.

Tài liệu ERD: [`docs/database/`](docs/database/). Ghi chú cho backend: [`docs/database/db-notes.md`](docs/database/db-notes.md).

## Backend Status

The [Rust backend](backend/Cargo.toml) uses Axum, Tokio, and a SQLx connection pool for PostgreSQL. The current server exposes two operational endpoints. The cinema workflows in the API contract are planned.

| Endpoint | Behavior |
| --- | --- |
| `GET /health` | Returns `200` when the HTTP process is running. |
| `GET /ready` | Returns `200` when PostgreSQL answers `SELECT 1` within two seconds, or `503` otherwise. |

Set `DATABASE_URL` to a PostgreSQL connection URL. `BIND_ADDR` is optional and defaults to `127.0.0.1:3000`.

## Database (PostgreSQL 16)

### Yêu cầu

- Docker + Docker Compose
- `make` (MSYS2/Git Bash trên Windows)
- File `.env` (sao chép từ `.env.example`)

### Dựng từ đầu

```bash
cp .env.example .env
make up
make migrate
make seed
make test
```

Reset môi trường **dev** (xóa volume named `medi_cine_pgdata`):

```bash
make reset CONFIRM=yes
```

### Lệnh Makefile

| Lệnh | Việc |
|---|---|
| `make up` | Chạy Postgres 16, đợi healthcheck |
| `make down` | Dừng container (giữ volume) |
| `make migrate` | Chạy `sql/migrations/` theo thứ tự (idempotent) |
| `make seed` | Nạp `sql/seed/` (idempotent) |
| `make test` | Chạy `sql/tests/` + kiểm tra đủ 21 bảng |
| `make psql` | Mở `psql` trong container |
| `make reset CONFIRM=yes` | `down -v` → up → migrate → seed |

### Kết nối

| Từ đâu | Host | Port | DB / user |
|---|---|---|---|
| Máy host | `localhost` | `POSTGRES_PORT` (5432) | xem `.env` |
| Container khác (cùng network) | `postgres` | `5432` | xem `.env` |

Ví dụ URL host: `postgresql://medi_cine:medi_cine_dev_password@localhost:5432/medi_cine`

## Repository Layout

- `backend/` contains the Rust crate and Cargo lockfile. [main.rs](backend/src/main.rs) starts the server, [config.rs](backend/src/config.rs) loads settings, [db.rs](backend/src/db.rs) initializes the SQLx pool, and [http/](backend/src/http) defines the router and handlers.
- `docs/api/` contains the [target API guide](docs/api/README.md), the [OpenAPI 3.1 contract](docs/api/openapi.yaml), and the use-case mappings and acceptance scenarios. The contract validator checks the specification and related documents.
- `pa/` contains course deliverables, including the cinema requirements and architecture.

## Team Members

| No. | Full name | Student ID | Role |
| --- | --- | --- | --- |
| 1 | Vân Hoàng Nhật |  |  |
| 2 | Trần Tấn Phát |  |  |
| 3 | Lê Hoàng Nam |  |  |
| 4 | Nguyễn Hoàng Nam |  |  |
| 5 | Huỳnh Vĩnh An |  |  |

## Team Working Rules

- Hold regular team meetings; every meeting has minutes recording discussions, decisions and task assignments.
- Every task has a responsible person and a clear deadline.
- Members report difficulties early so the whole team can help.

## License

This project is for educational purposes.
