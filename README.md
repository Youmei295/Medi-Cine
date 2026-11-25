# MEDI-CINE

Hệ thống quản lý rạp chiếu phim và đặt vé trực tuyến (Group 04). Schema database v6: 21 bảng, PostgreSQL 16.

Tài liệu ERD: [`docs/database/`](docs/database/). Ghi chú cho backend: [`docs/database/db-notes.md`](docs/database/db-notes.md).

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
