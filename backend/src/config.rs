use std::env::{self, VarError};
use std::net::SocketAddr;

pub(crate) struct Config {
    pub(crate) bind_addr: SocketAddr,
    pub(crate) database_url: String,
}

impl Config {
    pub(crate) fn from_env() -> Result<Self, &'static str> {
        let database_url = env::var("DATABASE_URL")
            .map_err(|_| "Set DATABASE_URL to a PostgreSQL connection URL")?;

        let bind_addr = match env::var("BIND_ADDR") {
            Ok(value) => value
                .parse()
                .map_err(|_| "BIND_ADDR must be an IP address and port")?,
            Err(VarError::NotPresent) => SocketAddr::from(([127, 0, 0, 1], 3000)),
            Err(VarError::NotUnicode(_)) => return Err("BIND_ADDR must be valid Unicode"),
        };

        Ok(Self {
            bind_addr,
            database_url,
        })
    }
}
