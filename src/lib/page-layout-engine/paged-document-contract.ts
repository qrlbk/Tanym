/**
 * Контракт схемы документа (для поиска по репо: docPage, PagedDocument).
 *
 * - Корень: `PagedDocument` → `content: "docPage+"` (см. extensions/PagedDocument.ts).
 * - Каждая страница: узел `docPage` → `block+`, DOM: `.doc-page-sheet` > `.doc-page-body`.
 * - Файлы/IO, plot-index, поиск — ожидают последовательность `docPage` в документе.
 * - Перенос на следующую страницу = новые `docPage` в ProseMirror или перенос блоков между ними.
 */

export const PAGED_DOCUMENT_ROOT_CONTENT = "docPage+" as const;
