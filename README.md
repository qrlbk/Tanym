

# Tanym

### AI-native writing studio for novels & long-form fiction

[Next.js](https://nextjs.org/)
[TipTap](https://tiptap.dev/)
[Tauri](https://v2.tauri.app/)
[License](LICENSE)
[Node](package.json)
[CI](https://github.com/qrlbk/Tanym/actions/workflows/ci.yml)

**English** · [Русский](README.ru.md) · [Қазақша](README.kk.md)

  




Default authoring language: **Russian** · Whole-project awareness · Continuity checks · DOCX · Optional full offline (Ollama)

---

##  Contents

[Overview](#overview) · [Author](#author) · [How Tanym came to be](#story) · [What makes it different](#features) · [Download installers](#download-installers) · [Documentation](#documentation) · [Requirements](#requirements) · [Setup](#setup) · [Environment](#environment) · [Run](#running) · [npm scripts](#npm-scripts) · [License](#license)

---

##  Overview

**An AI-first writing app for novelists and long-form fiction, with Russian as the default authoring language.** It understands your whole project: characters, chapters, scenes, and plot contradictions.

The source code is licensed under **Apache License 2.0** — see [LICENSE](LICENSE) and [NOTICE](NOTICE). Contributing: [CONTRIBUTING.md](CONTRIBUTING.md) · Community: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

---

##  Author


|                |                                                                   |
| -------------- | ----------------------------------------------------------------- |
| **Maintainer** | **Kuralbek Adilet**                                               |
| **Email**      | [kuralbekadilet475@gmail.com](mailto:kuralbekadilet475@gmail.com) |
| **Repository** | [github.com/qrlbk/Tanym](https://github.com/qrlbk/Tanym)          |


---

##  How Tanym came to be

The project is built by **one developer** — I write the code and **actively use AI** in my workflow (suggestions, refactors, docs): that’s normal for modern indie development; what matters is that the product and architecture stay under my control.

The idea was simple: when my **Word license expired**, I first thought about building something like **my own Word** — familiar UI, pages, documents. Pretty soon I **reframed the goal**: I didn’t need another office editor for office work. I wanted to **build worlds** — novels, scenes, characters — and I wanted a tool that helps **long-form authors**, not one that “formats reports.” So Tanym became a **personal** project: tuned to my language, my workflow, and my love of big stories. That other writers can use it too is a nice open-source bonus.

The client is **Next.js** (TipTap) with a ribbon-style editor, DOCX import/export, and a **Tauri** desktop shell. The writer copilot understands book structure (chapters → scenes → characters), finds plot inconsistencies, and can edit any scene in the project — not only the one you have open.

---

##  What makes it different


|                                   |                                                                                                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Whole project, not one file**   | The AI sees chapters, scenes, character cards, and can edit scenes you’re not currently in.                                                             |
| **Plot continuity**               | Vector index + rule-based detectors surface inconsistencies between scenes.                                                                             |
| **Character cards + AI approval** | The model suggests updates when new facts appear; you confirm.                                                                                          |
| **Full offline (Ollama)**         | “Fully offline” keeps your novel local — AI & embeddings on-device (e.g. Llama 3, Qwen2.5, `nomic-embed-text`). See `.env.example` & `OLLAMA_BASE_URL`. |
| **Russian-first**                 | Terminology, UI, and prompts tuned for Russian — no “unlearning” English-centric tools.                                                                 |
| **Ribbon + DOCX**                 | Familiar ribbon UI, round-trip DOCX.                                                                                                                    |


---

## Download installers

Get the latest desktop build from [GitHub Releases](https://github.com/qrlbk/Tanym/releases/latest).

- **Windows:** download `.msi` (or `.exe` if published), run installer.
- **macOS:** download `.dmg`, drag app into Applications.
- **Linux:** download `.AppImage` (portable) or `.deb` / `.rpm` package.

Checksums are published as `SHA256SUMS.txt` in each release.

---

##  Documentation

**Web docs (EN / RU / KK):** after `npm run dev`, open [http://localhost:3000/docs](http://localhost:3000/docs) (redirects to `/docs/en`). After `npm run build`, static output is under `out/docs/…`.


| Resource                                         | Description                                   |
| ------------------------------------------------ | --------------------------------------------- |
| [docs/README.md](docs/README.md)                 | Index and links into `content/docs`           |
| [content/docs/](content/docs/)                   | Article sources (Markdown per locale)         |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)       | Pointer → full text at `/docs/…/development`  |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)     | Pointer → full text at `/docs/…/architecture` |
| [docs/DISTRIBUTION.md](docs/DISTRIBUTION.md)     | Pointer → full text at `/docs/…/distribution` |
| [docs/PERFORMANCE.md](docs/PERFORMANCE.md)       | Pointer → full text at `/docs/…/performance`  |
| [docs/OPEN_SOURCE.md](docs/OPEN_SOURCE.md)       | Pointer → full text at `/docs/…/open-source`  |
| [CONTRIBUTING.md](CONTRIBUTING.md)               | How to contribute (PRs, style, tests)         |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)         | Code of conduct                               |
| [SECURITY.md](SECURITY.md)                       | Security disclosures                          |
| [CHANGELOG.md](CHANGELOG.md)                     | Release history                               |
| [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) | Third-party licenses                          |


---

##  Requirements

- **Node.js 20+** and **npm** — version pinned in `[package.json](package.json)` (`engines`); with [nvm](https://github.com/nvm-sh/nvm) run `nvm use` (`[.nvmrc](.nvmrc)` in repo root).
- **Web only:** Rust not required.
- **Desktop (Tauri):** [Rust](https://rustup.rs/) ≥ version in `[src-tauri/Cargo.toml](src-tauri/Cargo.toml)` (`rust-version`), plus [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/) for your OS.

Node is not installed by the repo — get it from [nodejs.org](https://nodejs.org/) or nvm/Homebrew.

---

##  One-command setup

From the repo root after cloning:

**macOS / Linux**

```bash
bash setup.sh
```

or `./setup.sh` if executable (`chmod +x setup.sh`).

**Windows (PowerShell)**

```powershell
.\setup.ps1
```

Runs `npm install`, then `[scripts/setup.mjs](scripts/setup.mjs)`: creates `.env.local` from `.env.example` (if missing) and checks `rustc` for Tauri.

**Web only** (skip Rust):

```bash
bash setup.sh --skip-rust
```

```powershell
.\setup.ps1 --skip-rust
```

**Install rustup** (if Rust missing/outdated — system-wide installer from [rustup.rs](https://rustup.rs/)):

```bash
bash setup.sh --install-rust
```

```powershell
.\setup.ps1 --install-rust
```

If `node_modules` already exists:

```bash
npm run setup
```

Examples: `npm run setup -- --install-rust` · `npm run setup -- --skip-rust`

After first rustup install, you may need a **new terminal**, then `npm run setup` again.

---

##  Environment variables

`.env.local` is created during setup from `.env.example`. Add your key for AI:

```bash
OPENAI_API_KEY=...
```

---

##  Running (after setup)


| Goal                          | Command                           |
| ----------------------------- | --------------------------------- |
| Web only (Next.js in browser) | `npm run dev`                     |
| Web + native Tauri window     | `npm run tauri:dev`               |
| Production web                | `npm run build` → `npm run start` |
| Desktop app                   | `npm run tauri:build`             |


---

##  npm scripts


| Command               | Description                                                            |
| --------------------- | ---------------------------------------------------------------------- |
| `npm run setup`       | `.env.local` from example; Rust check; `--install-rust`, `--skip-rust` |
| `npm run dev`         | Development (web)                                                      |
| `npm run build`       | Production build                                                       |
| `npm run start`       | Run after build                                                        |
| `npm run lint`        | ESLint                                                                 |
| `npm run test`        | Vitest                                                                 |
| `npm run tauri:dev`   | Desktop dev                                                            |
| `npm run tauri:build` | Desktop build                                                          |


---

##  License

Repository source code is **[Apache License 2.0](https://www.apache.org/licenses/LICENSE-2.0)**.  
Texts: [LICENSE](LICENSE) · Attribution: [NOTICE](NOTICE).

Dependencies (npm, crates.io) have **their own** licenses — [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

`"private": true` in `[package.json](package.json)` only blocks accidental npm publish; it does **not** waive Apache-2.0 for the source.

Consider filling `repository`, `homepage`, and `bugs` in `package.json` (see [docs/OPEN_SOURCE.md](docs/OPEN_SOURCE.md)).