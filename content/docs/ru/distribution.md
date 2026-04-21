# Дистрибуция, подпись и обновления

Как готовить релизные сборки Tanym к распространению.

## Скачать готовый установщик

Последние версии публикуются в [GitHub Releases](https://github.com/qrlbk/Tanym/releases/latest).

- Windows: `.msi` (иногда также `.exe`)
- macOS: `.dmg`
- Linux: `.AppImage`, `.deb`, `.rpm`

В каждом релизе есть `SHA256SUMS.txt` для проверки целостности.

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

## Процесс релиза для мейнтейнера (по тегу)

1. Обновить версии в `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`.
2. Обновить `CHANGELOG.md`.
3. Создать и запушить тег вида `vX.Y.Z`.
4. Workflow `.github/workflows/release.yml` автоматически собирает установщики под 3 ОС и публикует их в GitHub Release.
