# Сәулет

Tanym құрылымының жоғары деңгейлі картасы. Орнату — [README](https://github.com/qrlbk/Tanym#readme), [Әзірлеу](/docs/kk/development).

## Рантайм беттері

- **Веб:** Next.js App Router → React + TipTap.
- **Десктоп:** Tauri → WebView, сол фронтенд.
- **Жергілікті деректер:** `localStorage`, IndexedDB (құжат, жоба, AI чат, сюжет), эмбеддингтер үшін бөлек сақтау.
- **Желі:** AI үшін Next API; бұлт немесе Ollama.

## Негізгі жүйелер

| Аймақ | Рөлі |
|-------|------|
| **Story project** | `StoryProject`; `src/lib/project/` |
| **Редактор** | TipTap; `doc-persistence.ts` |
| **Layout** | `page-layout-engine/`, `layout/` |
| **AI** | `app/api/ai/`, `lib/ai/` |
| **Сюжет** | `plot-index/`, `plotStoryStore` |
| **Tauri** | `src-tauri/` |

## Ағын

1. Сцена түзету → Zustand.
2. JSON автосақтау.
3. Эмбеддинг / экстракт шақырулары.
4. Сюжет индексі — векторлар.

## Қауіпсіздік

API кілттері репода емес. Tauri capabilities. CSP.

## Қайда өзгерту

| Мақсат | Жол |
|--------|-----|
| Лента | `Ribbon/`, `Shell/` |
| Редактор | `Editor/extensions/` |
| AI | `lib/ai/`, `api/ai/` |
| DOCX | `file-io.ts`, `save-docx-workflow.ts` |
| Жинақ | [Тарату](/docs/kk/distribution) |
