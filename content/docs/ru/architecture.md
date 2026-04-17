# Архитектура

Высокоуровневая схема Tanym в рантайме. Установка и команды — в [README](https://github.com/qrlbk/Tanym#readme) и [Разработка](/docs/ru/development).

## Поверхности

- **Веб:** Next.js App Router → React + TipTap.
- **Десктоп:** Tauri → WebView с тем же фронтендом.
- **Локальные данные:** `localStorage`, IndexedDB (документ, проект, чаты ИИ, сюжет), отдельная БД для эмбеддингов сюжета.
- **Сеть:** API-маршруты Next.js для ИИ; облако или локальный Ollama.

## Подсистемы

| Область | Роль |
|---------|------|
| **Проект книги** | `StoryProject` (главы → сцены → карточки); `src/lib/project/`. |
| **Редактор** | TipTap / ProseMirror в `src/components/Editor/`; сохранение `doc-persistence.ts`. |
| **Вёрстка** | Страницы/reflow: `page-layout-engine/`, `layout/`. |
| **AI** | Инструменты + `src/app/api/ai/`; провайдеры `src/lib/ai/`. Опционально **Ollama**. |
| **Сюжет** | Store сюжета + индекс эмбеддингов (`plot-index/`, `plotStoryStore`). |
| **Tauri** | Диалоги, ФС, обновления — `src-tauri/`. |

## Поток данных (упрощённо)

1. Правка **сцены** в TipTap → обновление Zustand.
2. Автосохранение JSON проекта в **localStorage / IndexedDB**.
3. Фоновый анализ может вызывать **embeddings / extract**.
4. **Индекс сюжета** хранит векторы для поиска и continuity.

## Безопасность

- Ключи API — в `.env.local` или настройках сборки, не в репозитории.
- **Tauri** capabilities для доступа к диску.
- **CSP** и `allowedDevOrigins` для dev.

## Куда править код

| Цель | Где смотреть |
|------|----------------|
| Лента / оболочка | `Ribbon/`, `Shell/` |
| Расширения редактора | `Editor/extensions.ts`, `extensions/` |
| AI | `lib/ai/`, `app/api/ai/` |
| DOCX | `file-io.ts`, `save-docx-workflow.ts` |
| Сборка десктопа | `tauri.conf.json`, [Дистрибуция](/docs/ru/distribution) |
