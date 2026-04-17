# Дистрибуция, подпись и обновления

Документ описывает, как готовить релизную сборку Tanym к распространению.
Roadmap фаза 7: без этого проект остаётся хобби.

## 1. Модель монетизации (принятая)

- **Платный десктоп** (Tauri-сборка) — основной канал.
- **BYO cloud API key** — пользователь приносит свои ключи OpenAI / Anthropic /
  Google. Приложение не проксирует и не хранит их на наших серверах.
- **Локальный режим** — бесплатный. Через Ollama, без сети. См.
  [`../README.md`](../README.md) и `.env.example`.
- **SaaS / биллинг — позже.** Держать в голове, но пока не строить.

## 2. Code signing

Без подписи MS Defender / Gatekeeper отпугнут ~90% пользователей.

### macOS

Требуется:

- Apple Developer Program ($99/год).
- Developer ID Application cert.
- App-specific password (для нотаризации).

Секреты в GitHub Actions (см. `.github/workflows/ci.yml`):

| Секрет | Что это |
|--------|---------|
| `APPLE_CERTIFICATE` | base64-кодированный p12-сертификат |
| `APPLE_CERTIFICATE_PASSWORD` | пароль от p12 |
| `APPLE_SIGNING_IDENTITY` | `Developer ID Application: Your Name (TEAMID)` |
| `APPLE_ID` | Apple ID для notarytool |
| `APPLE_PASSWORD` | app-specific password |
| `APPLE_TEAM_ID` | 10-символьный Team ID |

Tauri сам подхватит эти env-переменные при `tauri:build`, если job подготовил
keychain. См. [Tauri code signing docs](https://v2.tauri.app/distribute/sign/macos/).

### Windows

- **Sectigo / DigiCert EV Code Signing** (~$400/год).
- Секреты:
  - `WINDOWS_CERTIFICATE` — base64 .pfx
  - `WINDOWS_CERTIFICATE_PASSWORD`

Без EV cert SmartScreen будет ругаться первые недели, пока «не наберётся
репутация». С EV — чисто с первой сборки.

### Linux

- AppImage и `.deb` можно не подписывать (инсталлеры дистрибутивов обычно
  проверяют чек-суммы через GPG манифест, а не сам бинарь).
- Flatpak / Snap — отдельно, пока не в скоупе.

## 3. Auto-updater

Конфигурация зарезервирована в `src-tauri/tauri.conf.json` под ключом
`plugins.updater`. Сейчас `active: false` — включаем после:

1. Создания ключевой пары:
   ```bash
   npm run tauri -- signer generate -w updater-key.key
   ```
2. Сохранения `updater-key.key` **вне репозитория** (секрет в 1Password / GitHub
   Actions secret `TAURI_SIGNING_PRIVATE_KEY`).
3. Вставки публичного ключа в `tauri.conf.json → plugins.updater.pubkey`.
4. Развёртывания `/{{target}}/{{arch}}/{{current_version}}` endpoint'а —
   статические JSON с сигнатурой (S3 + CloudFront или GitHub Releases через
   `updater-proxy` — проще всего).

Dev: включить `active: true` и направить endpoints на staging.

## 4. Лендинг

Отдельный репо или `apps/web-landing`. Содержимое MVP:

- Один большой скриншот редактора с AI-панелью и Story Bible.
- Три буллета: **continuity check**, **offline через Ollama**, **DOCX-совместимость**.
- Кнопки скачивания (macOS / Windows / Linux).
- Ссылка на Telegram-канал / Discord.

## 5. Чеклист релиза

- [ ] `CHANGELOG.md` обновлён.
- [ ] Версия синхронизирована: `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`.
- [ ] CI зелёный на текущем теге.
- [ ] `tauri:build` прошёл на всех трёх ОС (matrix в CI).
- [ ] Артефакты подписаны (для macOS — нотаризованы).
- [ ] Updater endpoint отдаёт свежий манифест.
- [ ] Лендинг обновлён.
