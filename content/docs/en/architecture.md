# Architecture overview

High-level map of how Tanym is structured at runtime. For setup and commands, see the [README](https://github.com/qrlbk/Tanym#readme) and [Development](/docs/en/development).

## Runtime surfaces

- **Web:** Next.js App Router → React UI + TipTap.
- **Desktop:** Tauri shell → WebView loads dev or static UI (same frontend).
- **Local data:** `localStorage`, IndexedDB (document, project, AI chats, plot story), separate IndexedDB for plot chunk embeddings.
- **Network:** Next.js API routes for AI when not fully offline; optional cloud providers or local Ollama.

## Major subsystems

| Area | Role |
|------|------|
| **Story project** | `StoryProject` (chapters → scenes → character cards); see `src/lib/project/`. |
| **Editor** | TipTap / ProseMirror under `src/components/Editor/`; persistence `src/lib/doc-persistence.ts`. |
| **Layout** | Page/reflow in `src/lib/page-layout-engine/` and `src/lib/layout/`. |
| **AI assistant** | Client tools + `src/app/api/ai/*`; providers `src/lib/ai/`. Optional **Ollama** offline. |
| **Plot memory** | Plot story store + embeddings index (`src/lib/plot-index/`, `src/stores/plotStoryStore.ts`). |
| **Tauri** | Native dialogs, filesystem, optional updater — `src-tauri/`. |

## Data flow (simplified)

1. User edits a **scene** in TipTap → Zustand `projectStore` / `documentStore` update.
2. Autosave persists project JSON to **localStorage or IndexedDB** (size-dependent).
3. Background analysis may call **embeddings / extract** APIs (local or remote).
4. **Plot index** stores vectors in IndexedDB for semantic search and continuity checks.

## Security boundaries

- **API keys** for cloud models live in `.env.local` or packaged settings — not in the repo.
- **Tauri** capabilities gate filesystem access (`src-tauri/capabilities/`).
- **CSP** and `allowedDevOrigins` protect local/LAN dev with Next.js.

## Where to change things

| Goal | Start here |
|------|------------|
| Ribbon / shell UI | `src/components/Ribbon/`, `src/components/Shell/` |
| Editor marks / commands | `src/components/Editor/extensions.ts`, `extensions/` |
| AI tool or prompt | `src/lib/ai/tools.ts`, `src/lib/ai/system-prompt.ts`, `src/app/api/ai/` |
| Export / DOCX | `src/lib/file-io.ts`, `src/lib/save-docx-workflow.ts` |
| Desktop packaging | `src-tauri/tauri.conf.json`, [Distribution](/docs/en/distribution) |
