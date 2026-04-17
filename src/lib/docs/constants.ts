export type DocsLocale = "en" | "ru" | "kk";

export const DEFAULT_DOCS_LOCALE: DocsLocale = "en";

export function isDocsLocale(s: string): s is DocsLocale {
  return s === "en" || s === "ru" || s === "kk";
}
