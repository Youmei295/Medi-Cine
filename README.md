# Medi-Cine

Medi-Cine is a student project for cinema ticket booking and operations. The target workflows cover browsing movies and showtimes, reserving seats, paying through VNPAY Sandbox, retrieving e-tickets, and checking guests in at the cinema.

## Backend Status

The [Rust backend](backend/Cargo.toml) uses Axum, Tokio, and a SQLx connection pool for PostgreSQL. The current server exposes two operational endpoints. The cinema workflows in the API contract are planned.

| Endpoint | Behavior |
| --- | --- |
| `GET /health` | Returns `200` when the HTTP process is running. |
| `GET /ready` | Returns `200` when PostgreSQL answers `SELECT 1` within two seconds, or `503` otherwise. |

Set `DATABASE_URL` to a PostgreSQL connection URL. `BIND_ADDR` is optional and defaults to `127.0.0.1:3000`.

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
