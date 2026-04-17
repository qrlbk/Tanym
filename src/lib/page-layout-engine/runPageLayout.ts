import type { Editor } from "@tiptap/core";
import { reflowDocPages } from "../page-reflow";
import { recordReflowLayoutCall } from "./reflow-dev-metrics";

/**
 * Единая точка входа пагинации (раскладка по листам A4).
 *
 * Статус (фаза 3 roadmap): реализация одна — `reflowDocPages` на базе `docPage+`.
 * Флаг `NEXT_PUBLIC_PAGINATION_V2` оставлен как feature-gate на будущее,
 * но пока он ничего не меняет. Реальная v2 (flat-document `block+` + виртуальные
 * страницы) не реализована — см. `migration-dual-read.ts`.
 *
 * Если будущая v2 появится, добавить здесь ветку и одновременно набор тестов
 * параллельного сравнения (snapshot пагинации на 3-5 реальных документах:
 * короткий, длинный, с таблицами, с картинками, с большими заголовками).
 *
 * Инварианты, которые НЕЛЬЗЯ ломать:
 *  - `REFLOW_VIEWPORT_EPS_PX` — допуск по высоте страницы
 *  - `layoutVersion` — счётчик, по которому инвалидируется кэш высот блоков
 *
 * См. `docs/PERFORMANCE.md`.
 */
export function isPaginationLayoutV2Enabled(): boolean {
  return (
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_PAGINATION_V2 === "true"
  );
}

export type RunPageLayoutOptions = {
  contentHeightPx: number;
  viewScale: number;
  expectedLayoutVersion?: number;
};

export function runPageLayout(editor: Editor, options: RunPageLayoutOptions): boolean {
  recordReflowLayoutCall();
  const { contentHeightPx, viewScale, expectedLayoutVersion } = options;
  // v2 пока не реализована — флаг сохранён, чтобы следующий разработчик мог
  // включить новую ветку, не правя DocumentCanvas. См. JSDoc выше.
  return reflowDocPages(editor, contentHeightPx, viewScale, expectedLayoutVersion);
}
