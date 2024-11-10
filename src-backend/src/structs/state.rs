use std::sync::Arc;

#[derive(Debug, Clone)]
pub struct GlobalState {
    id: String,
}
impl GlobalState {
    pub async fn new() -> Self {
        Self { id: "123".into() }
    }
}
