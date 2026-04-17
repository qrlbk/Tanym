import fs from "node:fs";
import path from "node:path";

import type { DocsLocale } from "./constants";
import { DEFAULT_DOCS_LOCALE } from "./constants";
import type { DocSlug } from "./registry";
import { isDocSlug } from "./registry";

const CONTENT_ROOT = path.join(process.cwd(), "content", "docs");

function filePath(locale: DocsLocale, slug: DocSlug): string {
  return path.join(CONTENT_ROOT, locale, `${slug}.md`);
}

export type LoadedDoc = {
  markdown: string;
  /** True when locale file was missing and we used fallback markdown */
  usedFallback: boolean;
  /** Locale of the markdown actually shown */
  sourceLocale: DocsLocale;
};

/**
 * Load markdown for a doc page. If `locale` file is missing, falls back to English
 * (typical for incomplete Kazakh translations).
 */
export function loadDocMarkdown(
  locale: DocsLocale,
  slug: string,
): LoadedDoc | null {
  if (!isDocSlug(slug)) return null;

  const primary = filePath(locale, slug);
  if (fs.existsSync(primary)) {
    return {
      markdown: fs.readFileSync(primary, "utf8"),
      usedFallback: false,
      sourceLocale: locale,
    };
  }

  if (locale !== DEFAULT_DOCS_LOCALE) {
    const fallback = filePath(DEFAULT_DOCS_LOCALE, slug);
    if (fs.existsSync(fallback)) {
      return {
        markdown: fs.readFileSync(fallback, "utf8"),
        usedFallback: true,
        sourceLocale: DEFAULT_DOCS_LOCALE,
      };
    }
  }

  return null;
}

export function docExists(locale: DocsLocale, slug: DocSlug): boolean {
  return fs.existsSync(filePath(locale, slug));
}
