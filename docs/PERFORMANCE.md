# Производительность — чеклист

## Ручные сценарии

1. **Длинный документ** (много `docPage`): быстрый набор у низа страницы, Enter, без заметных фризов.
2. **Зум** 75% / 100% / 125%: страницы не «ломаются», reflow завершается без мигания.
3. **Ресайз окна** (Tauri / браузер): холст и линейка остаются согласованными.
4. **Панель Story / ИИ**: открытие не блокирует набор на 1+ с (холодный кеш допустим один раз).

## DevTools

- **Performance**: записать 5–10 с набора; проверить **Long tasks** (>50 ms).
- **React Profiler** (при необходимости): лишние коммиты `DocumentCanvas` при смене несвязанного UI.

## Reflow (dev)

- `localStorage.setItem('DEBUG_REFLOW','1')` — в консоли раз в секунду счётчик вызовов `runPageLayout`.
- `localStorage.removeItem('DEBUG_REFLOW')` — выключить.

## Бандл

- `npm run analyze` — отчёт `@next/bundle-analyzer` после `next build` (артефакты в `.next`).

## Автотесты

- `npm test` — регрессия для `page-layout-engine` и остального.
- `src/lib/layout/pagination.snapshot.test.ts` — snapshot-пагинации на синтетических документах (короткий, длинный, заголовки, оверсайз-блок). Если пагинация сломается при рефакторе, эти снапшоты покажут, на каком сценарии.

## Инварианты пагинации (НЕ ЛОМАТЬ)

Два значения — источники правды всего layout-движка:

| Инвариант | Где живёт | Зачем |
|-----------|-----------|-------|
| `REFLOW_VIEWPORT_EPS_PX` | [src/lib/page-layout-engine/layout-metrics.ts](../src/lib/page-layout-engine/layout-metrics.ts) | Допуск по высоте страницы. Меньше — лишние reflow, больше — визуальный hairline-overflow. |
| `layoutVersion` | [src/lib/layout/layoutVersion.ts](../src/lib/layout/layoutVersion.ts) | Монотонный счётчик, инвалидирует кеш высот блоков при смене шрифта/зума/margins. |

Единая точка входа пагинации — `runPageLayout` из [src/lib/page-layout-engine/runPageLayout.ts](../src/lib/page-layout-engine/runPageLayout.ts). Флаг `NEXT_PUBLIC_PAGINATION_V2` зарезервирован под будущую flat-document реализацию (сейчас не меняет поведение — см. `migration-dual-read.ts`).
