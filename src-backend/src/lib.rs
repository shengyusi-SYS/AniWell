use axum::{serve::Serve, Router};
mod routes;
mod structs;

#[tokio::main]
pub async fn serve() -> Serve<Router, Router> {
    let app = Router::new().route_service("/", routes::route());
    let tcp_listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    axum::serve(tcp_listener, app)
}
