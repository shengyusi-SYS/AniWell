use std::sync::Arc;

use axum::{serve::Serve, Router};
mod routes;
mod structs;
use crate::structs::state::GlobalState;

#[tokio::main]
pub async fn serve() {
    let global_state = GlobalState::new().await;
    let app = Router::new().nest("/api", routes::route(global_state));
    let tcp_listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(tcp_listener, app).await.unwrap()
}
