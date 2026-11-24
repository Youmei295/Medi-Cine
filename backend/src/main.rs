mod config;
mod db;
mod http;

use std::error::Error;

use config::Config;
use tokio::net::TcpListener;

#[tokio::main]
async fn main() -> Result<(), Box<dyn Error>> {
    let config = Config::from_env()?;
    let pool = db::connect_lazy(&config.database_url)?;
    let listener = TcpListener::bind(config.bind_addr).await?;

    println!("Listening on {}", listener.local_addr()?);
    axum::serve(listener, http::router(pool)).await?;

    Ok(())
}
