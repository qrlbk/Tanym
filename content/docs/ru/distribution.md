# Дистрибуция, подпись и обновления

Как готовить релизные сборки Tanym к распространению.

## Модель монетизации (принятая)

- **Платный десктоп** (Tauri) — основной канал.
- **BYO cloud API key** — пользователь приносит ключи OpenAI / Anthropic / Google; приложение не проксирует и не хранит их на наших серверах.
- **Локальный режим** — бесплатно через Ollama. См. `.env.example` и README.
- **SaaS / биллинг** — позже.

## Code signing

Без подписи MS Defender / Gatekeeper отпугнут большинство пользователей.

### macOS

- Apple Developer Program ($99/год).
- Developer ID Application cert.
- App-specific password для нотаризации.

Секреты в GitHub Actions (см. `.github/workflows/ci.yml`): `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY`, `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID`.

См. [документацию Tauri по подписи macOS](https://v2.tauri.app/distribute/sign/macos/).

### Windows

- EV Code Signing (Sectigo / DigiCert и т.п.).
- Секреты: `WINDOWS_CERTIFICATE`, `WINDOWS_CERTIFICATE_PASSWORD`.

### Linux

AppImage / `.deb` часто без подписи; проверка через чек-суммы. Flatpak / Snap — отдельно.

## Auto-updater

В `src-tauri/tauri.conf.json` → `plugins.updater`, сейчас `active: false`. Включать после:

1. Генерация ключей: `npm run tauri -- signer generate -w updater-key.key`
2. Хранение ключа вне репозитория.
3. Публичный ключ в `pubkey`.
4. HTTPS endpoint с манифестами обновлений.

## Лендинг

Отдельный репозиторий или `apps/web-landing`: скриншот, три буллета, кнопки скачивания, ссылки на сообщество.

## Чеклист релиза

- [ ] Обновлён `CHANGELOG.md`.
- [ ] Версия в `package.json`, `Cargo.toml`, `tauri.conf.json`.
- [ ] CI зелёный.
- [ ] `tauri:build` на трёх ОС.
- [ ] Артефакты подписаны (macOS — нотаризованы).
- [ ] Endpoint обновлений (если включён).
- [ ] Лендинг обновлён.
