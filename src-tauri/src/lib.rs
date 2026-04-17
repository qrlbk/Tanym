use std::collections::BTreeSet;
use tauri::Manager;

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

/// Roadmap фаза 6: Ollama sidecar.
///
/// Возвращает endpoint локального Ollama-сервера. По умолчанию —
/// http://localhost:11434 (дефолт Ollama). Если пользователь установил Ollama
/// и запустил `ollama serve`, приложение ходит в этот endpoint через
/// `OLLAMA_BASE_URL` в `src/lib/ai/providers.ts`.
///
/// В будущем здесь можно:
///   - проверять `ollama list` — чтобы UI подсказал, какие модели скачаны;
///   - поднимать embedded-sidecar через `externalBin` (требует распространения
///     бинаря Ollama вместе с приложением — отдельный вопрос лицензии и размера).
#[tauri::command]
fn get_ollama_endpoint() -> String {
    std::env::var("OLLAMA_BASE_URL").unwrap_or_else(|_| "http://localhost:11434".to_string())
}

/// Быстрая health-проверка локального Ollama. Блокирующий net-запрос —
/// вызывать редко (при открытии настроек AI).
#[tauri::command]
async fn check_ollama_ready() -> Result<bool, String> {
    let endpoint = get_ollama_endpoint();
    let url = format!("{}/api/tags", endpoint.trim_end_matches('/'));
    match reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(2))
        .build()
        .map_err(|e| e.to_string())?
        .get(&url)
        .send()
        .await
    {
        Ok(resp) => Ok(resp.status().is_success()),
        Err(_) => Ok(false),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_system_fonts,
            get_ollama_endpoint,
            check_ollama_ready
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            // Без системного titlebar `maximized` из tauri.conf.json на macOS часто не применяется —
            // принудительно разворачиваем окно при старте.
            if let Some(window) = app.get_webview_window("main") {
                #[cfg(target_os = "macos")]
                {
                    let _ = window.set_simple_fullscreen(true);
                }
                #[cfg(not(target_os = "macos"))]
                {
                    let _ = window.maximize();
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
