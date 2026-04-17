# Тарату, қолтаңба және жаңартулар

Tanym релизін таратуға дайындау.

## Монетизация моделі

- **Төленетін десктоп** (Tauri) — негізгі арна.
- **BYO API кілті** — OpenAI / Anthropic / Google; біздің серверде сақталмайды.
- **Жергілікті режим** — Ollama, `.env.example` қараңыз.
- **SaaS** — кейін.

## Code signing

### macOS

Apple Developer, Developer ID, нотаризация. GitHub Actions құпиялары: `APPLE_*`, см. `.github/workflows/ci.yml`.

### Windows

EV қолтаңба, `WINDOWS_CERTIFICATE`, `WINDOWS_CERTIFICATE_PASSWORD`.

### Linux

Көбінесе қолтаңбасыз пакеттер; checksum тексеру.

## Auto-updater

`src-tauri/tauri.conf.json` → `plugins.updater`. Кілт жұпты генерациялап, pubkey қойып, HTTPS endpoint қажет.

## Лендинг

Бөлек репо немесе статикалық бет: скриншот, жүктеу түймелері.

## Релиз чеклисті

CHANGELOG, нұсқа синхроны, CI, `tauri:build`, қолтаңба, жаңарту endpoint.
