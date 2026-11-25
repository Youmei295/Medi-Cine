use sqlx::{PgPool, postgres::PgPoolOptions};

pub(crate) fn connect_lazy(database_url: &str) -> Result<PgPool, &'static str> {
    let valid_scheme = database_url
        .split_once("://")
        .is_some_and(|(scheme, _)| matches!(scheme, "postgres" | "postgresql"));
    if !valid_scheme {
        return Err("DATABASE_URL must use the postgres:// or postgresql:// scheme");
    }

    PgPoolOptions::new()
        .connect_lazy(database_url)
        .map_err(|_| "DATABASE_URL is not a valid PostgreSQL connection URL")
}
