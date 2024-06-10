use axum::Router;
mod users;
pub fn route() -> Router {
    Router::new().route_service("/users", users::route())
}
