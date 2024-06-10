use axum::{
    extract,
    http::StatusCode,
    routing::{get, post},
    Router,
};
use serde::Deserialize;

struct User {}

#[derive(Debug, Deserialize)]
pub struct LoginData {
    username: String,
    password: String,
}
pub fn route() -> Router {
    Router::new().route("/login", get(login))
}

async fn login(extract::Json(data): extract::Json<LoginData>) -> StatusCode {
    println!("{:?}", data);
    if data.username == "admin" && data.password == "admin" {
        StatusCode::OK
    } else {
        StatusCode::UNAUTHORIZED
    }
}
