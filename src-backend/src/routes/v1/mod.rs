use std::sync::Arc;

use axum::Router;

use crate::structs::state::GlobalState;
mod users;

pub fn route() -> Router<GlobalState> {
    let users_route = users::route();
    Router::new().nest("/users", users_route)
}
