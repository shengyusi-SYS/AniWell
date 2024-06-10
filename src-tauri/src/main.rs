// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    std::thread::spawn(|| {
        let _server = ani_well_backend_lib::serve();
    });
    ani_well_tauri_lib::run()
}
