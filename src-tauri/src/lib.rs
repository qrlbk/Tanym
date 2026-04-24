use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;
use tauri::State;
use tauri::path::BaseDirectory;
use rusqlite::{Connection, OptionalExtension, params};

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

const API_KEYCHAIN_SERVICE: &str = "com.tanym.app.ai";
const PLOT_MEMORY_SCHEMA_VERSION: i64 = 1;

struct PlotDbState {
    conn: Mutex<Connection>,
}

#[derive(Debug, Serialize, Deserialize)]
struct SceneCacheEntry {
    scene_id: String,
    fingerprint: String,
    entities: Vec<String>,
    last_analyzed_at: i64,
}

#[derive(Debug, Serialize, Deserialize)]
struct SceneFingerprintInput {
    scene_id: String,
    fingerprint: String,
}

#[derive(Debug, Clone, Copy, Deserialize)]
#[serde(rename_all = "lowercase")]
enum ApiKeyProvider {
    Openai,
    Anthropic,
    Google,
}

impl ApiKeyProvider {
    fn account_name(self) -> &'static str {
        match self {
            ApiKeyProvider::Openai => "openai",
            ApiKeyProvider::Anthropic => "anthropic",
            ApiKeyProvider::Google => "google",
        }
    }
}

#[derive(Debug, Serialize)]
struct ApiKeyStatus {
    has_key: bool,
}

#[tauri::command]
fn set_api_key(provider: ApiKeyProvider, value: String) -> Result<(), String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err("API key must not be empty.".to_string());
    }
    let entry = keyring::Entry::new(API_KEYCHAIN_SERVICE, provider.account_name())
        .map_err(|e| e.to_string())?;
    entry.set_password(trimmed).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_api_key_status(provider: ApiKeyProvider) -> Result<ApiKeyStatus, String> {
    let entry = keyring::Entry::new(API_KEYCHAIN_SERVICE, provider.account_name())
        .map_err(|e| e.to_string())?;
    match entry.get_password() {
        Ok(value) => Ok(ApiKeyStatus {
            has_key: !value.trim().is_empty(),
        }),
        Err(keyring::Error::NoEntry) => Ok(ApiKeyStatus { has_key: false }),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn delete_api_key(provider: ApiKeyProvider) -> Result<(), String> {
    let entry = keyring::Entry::new(API_KEYCHAIN_SERVICE, provider.account_name())
        .map_err(|e| e.to_string())?;
    match entry.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

fn open_plot_db(app: &tauri::AppHandle) -> Result<Connection, String> {
    let app_data = app
        .path()
        .resolve("plot-memory", BaseDirectory::AppData)
        .map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&app_data).map_err(|e| e.to_string())?;
    let db_path: PathBuf = app_data.join("plot_memory.sqlite3");
    let conn = Connection::open(db_path).map_err(|e| e.to_string())?;
    conn.execute_batch(
        r#"
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;

        CREATE TABLE IF NOT EXISTS plot_memory (
          project_id TEXT PRIMARY KEY NOT NULL,
          payload_json TEXT NOT NULL,
          schema_version INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS plot_scene_cache (
          project_id TEXT NOT NULL,
          scene_id TEXT NOT NULL,
          fingerprint TEXT NOT NULL,
          entities_json TEXT NOT NULL,
          last_analyzed_at INTEGER NOT NULL,
          PRIMARY KEY (project_id, scene_id)
        );

        CREATE TABLE IF NOT EXISTS plot_warnings (
          project_id TEXT NOT NULL,
          warning_key TEXT NOT NULL,
          status TEXT NOT NULL,
          updated_at INTEGER NOT NULL,
          PRIMARY KEY (project_id, warning_key)
        );

        CREATE TABLE IF NOT EXISTS plot_reasoning (
          project_id TEXT NOT NULL,
          scene_id TEXT NOT NULL,
          reasoning_json TEXT NOT NULL,
          updated_at INTEGER NOT NULL,
          PRIMARY KEY (project_id, scene_id)
        );
        "#,
    )
    .map_err(|e| e.to_string())?;
    Ok(conn)
}

#[tauri::command]
fn get_plot_memory(state: State<PlotDbState>, project_id: String) -> Result<Option<String>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT payload_json FROM plot_memory WHERE project_id = ?1",
        params![project_id],
        |row| row.get::<_, String>(0),
    )
    .optional()
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn set_plot_memory(state: State<PlotDbState>, project_id: String, payload_json: String) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis() as i64;
    conn.execute(
        r#"
        INSERT INTO plot_memory (project_id, payload_json, schema_version, updated_at)
        VALUES (?1, ?2, ?3, ?4)
        ON CONFLICT(project_id) DO UPDATE SET
          payload_json = excluded.payload_json,
          schema_version = excluded.schema_version,
          updated_at = excluded.updated_at
        "#,
        params![project_id, payload_json, PLOT_MEMORY_SCHEMA_VERSION, now],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_scene_fingerprint(
    state: State<PlotDbState>,
    project_id: String,
    scene_id: String,
) -> Result<Option<String>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT fingerprint FROM plot_scene_cache WHERE project_id = ?1 AND scene_id = ?2",
        params![project_id, scene_id],
        |row| row.get::<_, String>(0),
    )
    .optional()
    .map_err(|e| e.to_string())
}

#[tauri::command]
fn upsert_scene_cache_entry(
    state: State<PlotDbState>,
    project_id: String,
    scene_id: String,
    fingerprint: String,
    entities: Vec<String>,
    last_analyzed_at: i64,
) -> Result<(), String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let entities_json = serde_json::to_string(&entities).map_err(|e| e.to_string())?;
    conn.execute(
        r#"
        INSERT INTO plot_scene_cache (project_id, scene_id, fingerprint, entities_json, last_analyzed_at)
        VALUES (?1, ?2, ?3, ?4, ?5)
        ON CONFLICT(project_id, scene_id) DO UPDATE SET
          fingerprint = excluded.fingerprint,
          entities_json = excluded.entities_json,
          last_analyzed_at = excluded.last_analyzed_at
        "#,
        params![project_id, scene_id, fingerprint, entities_json, last_analyzed_at],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_scene_cache_entries(state: State<PlotDbState>, project_id: String) -> Result<Vec<SceneCacheEntry>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare(
            "SELECT scene_id, fingerprint, entities_json, last_analyzed_at FROM plot_scene_cache WHERE project_id = ?1",
        )
        .map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![project_id], |row| {
            let entities_json: String = row.get(2)?;
            let entities: Vec<String> = serde_json::from_str(&entities_json).unwrap_or_default();
            Ok(SceneCacheEntry {
                scene_id: row.get(0)?,
                fingerprint: row.get(1)?,
                entities,
                last_analyzed_at: row.get(3)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for entry in rows {
        out.push(entry.map_err(|e| e.to_string())?);
    }
    Ok(out)
}

#[tauri::command]
fn list_stale_scenes(
    state: State<PlotDbState>,
    project_id: String,
    scenes: Vec<SceneFingerprintInput>,
) -> Result<Vec<String>, String> {
    let conn = state.conn.lock().map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    for scene in scenes {
        let stored = conn
            .query_row(
                "SELECT fingerprint FROM plot_scene_cache WHERE project_id = ?1 AND scene_id = ?2",
                params![project_id, scene.scene_id],
                |row| row.get::<_, String>(0),
            )
            .optional()
            .map_err(|e| e.to_string())?;
        if stored.as_deref() != Some(scene.fingerprint.as_str()) {
            out.push(scene.scene_id);
        }
    }
    Ok(out)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_system_fonts,
            get_ollama_endpoint,
            check_ollama_ready,
            set_api_key,
            get_api_key_status,
            delete_api_key,
            get_plot_memory,
            set_plot_memory,
            get_scene_fingerprint,
            upsert_scene_cache_entry,
            get_scene_cache_entries,
            list_stale_scenes
        ])
        .setup(|app| {
            let conn = open_plot_db(&app.handle())?;
            app.manage(PlotDbState {
                conn: Mutex::new(conn),
            });
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
