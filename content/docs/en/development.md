# Development

Short overview of the stack and repository layout. Full setup is in the [README](https://github.com/qrlbk/Tanym#readme).

## Positioning

**Tanym** is an AI writing environment for novelists and long-form fiction (Russian-first UX). The core is a writer copilot that understands the whole project (`StoryProject → Chapter → Scene → Character`), cross-scene edits, and continuity checks.

When in doubt, optimize for a **solo novelist**, not an office suite. Mail merge, academic references, and contract templates are intentionally out of scope.

## Stack

| Layer | Tech |
|-------|------|
| UI | React 19, Next.js 16, Tailwind CSS 4 |
| Editor | TipTap 3, ProseMirror (`@tiptap/pm`) |
| State | Zustand |
| Desktop | Tauri 2 (`src-tauri/`) |
| Tests | Vitest |

## Repository layout

| Path | Role |
|------|------|
| `src/app/` | Next.js App Router routes and layouts |
| `src/components/` | UI, ribbon, editor, dialogs |
| `src/components/Editor/` | Editor provider, TipTap extensions |
| `src/lib/` | Utilities, AI client, file I/O |
| `src/stores/` | Zustand stores |
| `src-tauri/` | Rust + Tauri config |
| `scripts/` | Maintenance scripts (`setup.mjs`, etc.) |

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Web dev server |
| `npm run build` | Production Next.js build |
| `npm run tauri:dev` | Desktop dev (Tauri + web) |
| `npm run tauri:build` | Desktop release build |
| `npm run lint` | ESLint |
| `npm run test` | Vitest |

## Next.js

This repo tracks a current major Next.js line. Before changing routing, config, or Route Handlers, skim the guides under `node_modules/next/dist/docs/` in your installed package.

## Environment

See `.env.example` and the README. Never commit real API keys.

## See also

- [Architecture](/docs/en/architecture)
- [Open source checklist](/docs/en/open-source)
