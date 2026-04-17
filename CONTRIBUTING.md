# Contributing to Tanym

Thank you for your interest in the project. This document explains how to work
with the codebase, open issues, and submit pull requests.

## Code of conduct

Everyone participating is expected to follow the
[Code of Conduct](CODE_OF_CONDUCT.md). Be respectful and constructive.

## License for your contributions

Unless you state otherwise, any contribution you submit is understood to be
licensed under the same terms as the project: **Apache License, Version 2.0**
(see [LICENSE](LICENSE) and [NOTICE](NOTICE)).

## Getting started

1. **Fork** the repository (if you do not have write access) and clone it.
2. Install tooling as described in [README.md](README.md):
   - `bash setup.sh` (macOS / Linux) or `.\setup.ps1` (Windows), or
   - `npm install` and `npm run setup`.
3. Run the app:
   - Web: `npm run dev`
   - Desktop: `npm run tauri:dev` (Rust + Tauri prerequisites required).

## What to work on

- **Bugs**: open an issue with reproduction steps, expected vs actual behavior,
  and your environment (OS, browser or Tauri, Node version).
- **Features**: open an issue first for larger ideas so maintainers can align
  on scope and UX before you invest a lot of time.
- **Good first issues**: look for labels such as `good first issue` in the issue
  tracker (when the project uses them).

## Development workflow

1. Create a branch from the default branch (`main` or as documented in the repo).
2. Make focused changes; avoid unrelated refactors in the same PR.
3. Before opening a PR:
   - `npm run lint`
   - `npm run test`
   - For UI changes, briefly describe how you verified behavior (manual steps).
4. Open a **pull request** with:
   - A clear title and description (what / why, not only how).
   - Links to related issues, if any.

### Style and architecture

- **TypeScript / React**: follow existing patterns in `src/` (hooks, Zustand
  stores, component structure).
- **Product direction**: Tanym targets **long-form fiction authors** (novels
  in Russian by default). Avoid turning the product into a generic office suite;
  see [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md#позиционирование).
- **Secrets**: never commit API keys, tokens, or personal `.env` files. Use
  `.env.example` as the template only.

### Telemetry

Changes under `src/lib/telemetry/` need extra care: by design, no manuscript
content (scene text, character names from the story, prompts) must be sent in
events. Telemetry is opt-in; extend tests or docs when behavior changes.

### Internationalization

Primary UI language is **Russian**. New user-visible strings should be Russian
unless there is an established bilingual pattern in the area you edit.

## Community (optional channels)

Release announcements and casual author discussions may move to Telegram /
Discord over time; when links exist, they will appear in the README. Until
then, GitHub Issues and Discussions (if enabled) are the main channels.

## Maintainer

Primary maintainer: **Kuralbek Adilet** — [kuralbekadilet475@gmail.com](mailto:kuralbekadilet475@gmail.com).

## Questions

If something in the docs is unclear after reading [README.md](README.md) and
[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md), open an issue with the `documentation`
label or ask in an existing discussion thread.
