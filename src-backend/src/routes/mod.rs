use axum::Router;

use crate::structs::state::GlobalState;

mod v1;

pub fn route<S>(state: GlobalState) -> Router<S> {
    Router::new().nest("/v1", v1::route()).with_state(state)
}
