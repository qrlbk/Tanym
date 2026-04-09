use std::collections::BTreeSet;

#[tauri::command]
fn get_system_fonts() -> Vec<String> {
    let source = font_kit::source::SystemSource::new();
    let mut families = BTreeSet::new();
    if let Ok(all) = source.all_families() {
        for name in all {
            if !name.starts_with('.') {
                families.insert(name);
            }
        }
    }
    families.into_iter().collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![get_system_fonts])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
