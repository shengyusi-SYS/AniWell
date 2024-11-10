use std::sync::Arc;

use axum::{
    extract::{self, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;

use crate::structs::state::GlobalState;

struct User {}

#[derive(Debug, Deserialize)]
pub struct LoginData {
    username: String,
    password: String,
}
pub fn route() -> Router<GlobalState> {
    Router::new().route("/login", get(login))
}

async fn login(State(state): State<GlobalState>, Json(data): Json<LoginData>) -> StatusCode {
    println!("{:?}{:?}", data, state);
    if data.username == "admin" && data.password == "admin" {
        StatusCode::OK
    } else {
        StatusCode::UNAUTHORIZED
    }
}
