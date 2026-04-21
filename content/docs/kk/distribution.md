# Тарату, қолтаңба және жаңартулар

Tanym релизін таратуға дайындау.

## Дайын орнатқышты жүктеу

Соңғы нұсқалар [GitHub Releases](https://github.com/qrlbk/Tanym/releases/latest) бетінде жарияланады.

- Windows: `.msi` (кейде `.exe`)
- macOS: `.dmg`
- Linux: `.AppImage`, `.deb`, `.rpm`

Әр релизде тұтастықты тексеруге арналған `SHA256SUMS.txt` бар.

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

## Мейнтейнерге релиз ағымы (тег арқылы)

1. `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json` файлдарындағы нұсқаны жаңарту.
2. `CHANGELOG.md` жаңарту.
3. `vX.Y.Z` форматында тег жасап, push ету.
4. `.github/workflows/release.yml` workflow-ы 3 ОС үшін орнатқыштарды жинап, GitHub Release бетіне автоматты түрде жариялайды.
