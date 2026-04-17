# Tanym

**Languages:** English (this file) · [Русский](README.ru.md) · [Қазақша](README.kk.md)

[License](LICENSE)
[Node](package.json)

**An AI-first writing app for novelists and long-form fiction, with Russian as the default authoring language.** It understands your whole project: characters, chapters, scenes, and plot contradictions.

The source code is licensed under **Apache License 2.0** — see [LICENSE](LICENSE) and [NOTICE](NOTICE). Contributing: [CONTRIBUTING.md](CONTRIBUTING.md), community guidelines: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Author

**Kuralbek Adilet** — creator and lead maintainer.  
Email: [kuralbekadilet475@gmail.com](mailto:kuralbekadilet475@gmail.com).  
Repository: [github.com/qrlbk/Tanym](https://github.com/qrlbk/Tanym).

### How Tanym came to be

The project is built by **one developer** — I write the code and **actively use AI** in my workflow (suggestions, refactors, docs): that’s normal for modern indie development; what matters is that the product and architecture stay under my control.

The idea was simple: when my **Word license expired**, I first thought about building something like **my own Word** — familiar UI, pages, documents. Pretty soon I **reframed the goal**: I didn’t need another office editor for office work. I wanted to **build worlds** — novels, scenes, characters — and I wanted a tool that helps **long-form authors**, not one that “formats reports.” So Tanym became a **personal** project: tuned to my language, my workflow, and my love of big stories. That other writers can use it too is a nice open-source bonus.

The client is Next.js (TipTap) with A4 pages, DOCX import/export, and a Tauri desktop shell. The writer copilot understands book structure (chapters → scenes → characters), finds plot inconsistencies, and can edit any scene in the project — not only the one you have open.

## How it differs from Google Docs / Scrivener and classic office editors

- **Knows the whole project, not just the open file.** The AI sees chapters, scenes, character cards, and can edit scenes you’re not currently in.
- **Checks plot continuity.** A vector index over the text plus rule-based detectors surface inconsistencies between scenes.
- **Character cards with AI approval.** The model suggests character updates when new facts appear; you confirm.
- **Fully offline via Ollama.** Turn on “Fully offline” and your novel never leaves your machine: AI and embeddings run locally (Llama 3, Qwen2.5, `nomic-embed-text`). See `.env.example` and `OLLAMA_BASE_URL`.
- **Russian-first by default.** Terminology, UI, and prompts are tuned for Russian; no need to “unlearn” English-centric tools like Novelcrafter/Sudowrite.
- **Familiar ribbon and A4 pages.** Ribbon tabs, page layout, DOCX both ways.

## Documentation

**Web docs (EN / RU / KK):** after `npm run dev`, open [http://localhost:3000/docs](http://localhost:3000/docs) (redirects to `/docs/en`). After `npm run build`, static output is under `out/docs/…`.

| Resource | Description |
| -------- | ----------- |
| [docs/README.md](docs/README.md) | Index and links into `content/docs` |
| [content/docs/](content/docs/) | Article sources (Markdown per locale) |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | Pointer; full text on the web at `/docs/…/development` |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Pointer; full text on the web at `/docs/…/architecture` |
| [docs/DISTRIBUTION.md](docs/DISTRIBUTION.md) | Pointer; full text on the web at `/docs/…/distribution` |
| [docs/PERFORMANCE.md](docs/PERFORMANCE.md) | Pointer; full text on the web at `/docs/…/performance` |
| [docs/OPEN_SOURCE.md](docs/OPEN_SOURCE.md) | Pointer; full text on the web at `/docs/…/open-source` |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How to contribute (PRs, style, tests) |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Community code of conduct |
| [SECURITY.md](SECURITY.md) | Reporting security issues |
| [CHANGELOG.md](CHANGELOG.md) | Release history |
| [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) | Third-party components and licenses |


## Requirements

- **Node.js 20+** and **npm** (Node version is pinned in `[package.json](package.json)` under `engines`; with [nvm](https://github.com/nvm-sh/nvm) you can run `nvm use` — there is an `[.nvmrc](.nvmrc)` in the repo root).
- **Web only** (browser): Rust is not required.
- **Desktop (Tauri)**: [Rust](https://rustup.rs/) at least the version in `[src-tauri/Cargo.toml](src-tauri/Cargo.toml)` (`rust-version`), plus OS-specific dependencies — see [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/).

Node.js is not installed by the repo: install it from [nodejs.org](https://nodejs.org/) or via nvm/Homebrew, etc.

## One-command setup

From the repo root after cloning:

**macOS / Linux**

```bash
bash setup.sh
```

or `./setup.sh` if the file is executable (`chmod +x setup.sh`).

**Windows** (PowerShell)

```powershell
.\setup.ps1
```

The script runs `npm install`, then `[scripts/setup.mjs](scripts/setup.mjs)`: creates `.env.local` from `.env.example` (if missing) and checks for a suitable `rustc` for Tauri.

If you only need the **web** app and don’t plan to install Rust:

```bash
bash setup.sh --skip-rust
```

```powershell
.\setup.ps1 --skip-rust
```

If Rust is missing or too old, rerun with automatic **rustup** install (system-wide — official installer from [rustup.rs](https://rustup.rs/)):

```bash
bash setup.sh --install-rust
```

```powershell
.\setup.ps1 --install-rust
```

If npm dependencies are already installed:

```bash
npm run setup
```

Pass arguments to `npm run setup` after `--`, for example:

- `npm run setup -- --install-rust`
- `npm run setup -- --skip-rust`

After the first rustup install you may need to **open a new terminal**, then run `npm run setup` again.

## Environment variables

`.env.local` is created during setup from `.env.example`. Add your key for AI features:

```bash
OPENAI_API_KEY=...
```

## Running (after setup)


| Goal | Command |
| ---- | ------- |
| Web only (Next.js in the browser) | `npm run dev` |
| Web + native Tauri window (Next dev server starts automatically) | `npm run tauri:dev` |
| Production web build | `npm run build` then `npm run start` |
| Desktop app build | `npm run tauri:build` |


## npm scripts


| Command | Description |
| ------- | ----------- |
| `npm run setup` | `.env.local` from example; Rust check for Tauri; flags `--install-rust`, `--skip-rust` (see above) |
| `npm run dev` | Development (web) |
| `npm run build` | Production build |
| `npm run start` | Run after build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |
| `npm run tauri:dev` | Desktop (Tauri) in development |
| `npm run tauri:build` | Build desktop app |


## License

Repository source code is **[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)**.  
License text: [LICENSE](LICENSE); attribution when distributing: [NOTICE](NOTICE).

Dependencies (npm, crates.io) have **their own** licenses — see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

The `"private": true` field in `[package.json](package.json)` only prevents accidental publishing to npm; it does **not** waive Apache-2.0 for the source.

After publishing on GitHub, consider filling `repository`, `homepage`, and `bugs` in `package.json` (see [docs/OPEN_SOURCE.md](docs/OPEN_SOURCE.md)).
