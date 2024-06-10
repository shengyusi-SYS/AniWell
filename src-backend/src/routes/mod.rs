use axum::Router;

mod v1;

pub fn route() -> Router {
    Router::new().route_service("/v1", v1::route())
}
