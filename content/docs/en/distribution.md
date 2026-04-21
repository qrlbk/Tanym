# Distribution, signing, and updates

How to prepare Tanym release builds for shipping.

## Download for end users

Latest installers are published at [GitHub Releases](https://github.com/qrlbk/Tanym/releases/latest).

- Windows: `.msi` (or `.exe` when available)
- macOS: `.dmg`
- Linux: `.AppImage`, `.deb`, `.rpm`

Each release also includes `SHA256SUMS.txt` for integrity checks.

## Monetization model (current direction)

- **Paid desktop** (Tauri build) as a primary channel.
- **BYO cloud API key** — users bring OpenAI / Anthropic / Google keys; the app does not proxy or store them on our servers.
- **Local mode** — free path via Ollama offline. See `.env.example` and the README.
- **SaaS / billing** — later; not a focus yet.

## Code signing

Without signing, Windows Defender / Gatekeeper scare most users.

### macOS

- Apple Developer Program (~$99/year).
- Developer ID Application certificate.
- App-specific password for notarization.

Typical GitHub Actions secrets (see `.github/workflows/ci.yml`):

| Secret | Purpose |
|--------|---------|
| `APPLE_CERTIFICATE` | base64 `.p12` |
| `APPLE_CERTIFICATE_PASSWORD` | p12 password |
| `APPLE_SIGNING_IDENTITY` | `Developer ID Application: …` |
| `APPLE_ID`, `APPLE_PASSWORD`, `APPLE_TEAM_ID` | notarytool |

See [Tauri macOS signing](https://v2.tauri.app/distribute/sign/macos/).

### Windows

- EV code signing cert (vendor pricing varies).
- Secrets: `WINDOWS_CERTIFICATE` (base64 `.pfx`), `WINDOWS_CERTIFICATE_PASSWORD`.

### Linux

AppImage / `.deb` often ship unsigned; distros verify checksums. Flatpak/Snap out of scope for now.

## Auto-updater

Reserved in `src-tauri/tauri.conf.json` under `plugins.updater` (`active: false` until):

1. Key pair: `npm run tauri -- signer generate -w updater-key.key`
2. Keep `updater-key.key` **outside** the repo (e.g. GitHub secret `TAURI_SIGNING_PRIVATE_KEY`).
3. Public key in `tauri.conf.json → plugins.updater.pubkey`.
4. HTTPS endpoint serving signed update manifests.

## Landing page

Separate repo or `apps/web-landing` MVP: hero screenshot, three bullets (continuity, Ollama offline, DOCX), download buttons, community links.

## Release checklist

- [ ] `CHANGELOG.md` updated.
- [ ] Version synced: `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`.
- [ ] CI green on the tag.
- [ ] `tauri:build` on macOS / Windows / Linux (matrix).
- [ ] Signed (and notarized on macOS) artifacts.
- [ ] Updater endpoint live (if enabled).
- [ ] Landing updated.

## Maintainer release flow (GitHub tags)

1. Update versions in `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`.
2. Update `CHANGELOG.md`.
3. Create and push tag: `vX.Y.Z`.
4. GitHub Action `.github/workflows/release.yml` builds installers for all 3 OSes and publishes assets into the GitHub Release page.
