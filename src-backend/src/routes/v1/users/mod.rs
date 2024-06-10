use anyhow::Ok;
use axum::{
    routing::{get, post},
    Router,
};

use crate::structs::ServerError;

pub fn route() -> Router {
    Router::new().route("/login", get(login))
}

async fn login() -> Result<(), ServerError> {}
