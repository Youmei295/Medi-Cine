mod health;

use axum::{Router, routing::get};
use sqlx::PgPool;

pub(crate) fn router(pool: PgPool) -> Router {
    Router::new()
        .route("/health", get(health::liveness))
        .route("/ready", get(health::readiness))
        .with_state(pool)
}
