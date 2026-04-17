# Производительность — чеклист

## Ручные сценарии

1. **Длинный документ** (много `docPage`): быстрый набор у низа страницы, Enter, без заметных фризов.
2. **Зум** 75% / 100% / 125%: страницы не «ломаются», reflow без мигания.
3. **Ресайз окна** (Tauri / браузер): холст и линейка согласованы.
4. **Панель Story / ИИ**: открытие не блокирует набор на 1+ с (холодный кеш один раз допустим).

## DevTools

- **Performance**: 5–10 с записи набора; **Long tasks** (>50 ms).
- **React Profiler**: лишние коммиты `DocumentCanvas`.

## Reflow (dev)

- `localStorage.setItem('DEBUG_REFLOW','1')` — счётчик `runPageLayout`.
- `localStorage.removeItem('DEBUG_REFLOW')` — выкл.

## Бандл

- `npm run analyze` после `next build`.

## Автотесты

- `npm test`
- `pagination.snapshot.test.ts` — снапшоты пагинации.

## Инварианты пагинации

| Инвариант | Где | Зачем |
|-----------|-----|-------|
| `REFLOW_VIEWPORT_EPS_PX` | `layout-metrics.ts` | Допуск по высоте страницы. |
| `layoutVersion` | `layoutVersion.ts` | Инвалидация кеша при шрифте/зуме/полях. |

Точка входа: `runPageLayout`. `NEXT_PUBLIC_PAGINATION_V2` — резерв (`migration-dual-read.ts`).
