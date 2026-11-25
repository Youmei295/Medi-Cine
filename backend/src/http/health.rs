use std::time::Duration;

use axum::{Json, extract::State, http::StatusCode};
use serde::Serialize;
use sqlx::PgPool;
use tokio::time::timeout;

const READINESS_TIMEOUT: Duration = Duration::from_secs(2);

#[derive(Serialize)]
pub(super) struct HealthStatus {
    status: &'static str,
}

pub(super) async fn liveness() -> Json<HealthStatus> {
    Json(HealthStatus { status: "ok" })
}

pub(super) async fn readiness(State(pool): State<PgPool>) -> (StatusCode, Json<HealthStatus>) {
    let check = timeout(READINESS_TIMEOUT, sqlx::query("SELECT 1").execute(&pool)).await;
    let (code, status) = match check {
        Ok(Ok(_)) => (StatusCode::OK, "ready"),
        _ => (StatusCode::SERVICE_UNAVAILABLE, "unavailable"),
    };

    (code, Json(HealthStatus { status }))
}
