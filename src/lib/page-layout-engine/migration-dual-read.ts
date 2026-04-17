/**
 * Опциональная будущая миграция: `docPage+` → один поток `block+` + виртуальные страницы.
 * Не реализовано намеренно; dual-read и скрипт миграции — отдельный эпик после стабилизации runPageLayout.
 */
export const MIGRATION_FLAT_DOCUMENT_PLANNED = false as const;
