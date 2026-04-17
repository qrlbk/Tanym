import type { DocsLocale } from "./constants";

export type DocSlug =
  | "development"
  | "architecture"
  | "distribution"
  | "performance"
  | "open-source";

export type DocNavItem = {
  slug: DocSlug;
  /** Sidebar / card titles per locale */
  titles: Record<DocsLocale, string>;
};

export const DOCS_LOCALES: readonly DocsLocale[] = ["en", "ru", "kk"] as const;

export const DOC_NAV: DocNavItem[] = [
  {
    slug: "development",
    titles: {
      en: "Development",
      ru: "Разработка",
      kk: "Әзірлеу",
    },
  },
  {
    slug: "architecture",
    titles: {
      en: "Architecture",
      ru: "Архитектура",
      kk: "Сәулет",
    },
  },
  {
    slug: "distribution",
    titles: {
      en: "Distribution & signing",
      ru: "Дистрибуция и подпись",
      kk: "Тарату және қолтаңба",
    },
  },
  {
    slug: "performance",
    titles: {
      en: "Performance",
      ru: "Производительность",
      kk: "Өнімділік",
    },
  },
  {
    slug: "open-source",
    titles: {
      en: "Open source checklist",
      ru: "Чеклист open source",
      kk: "Ашық код тексерім тізімі",
    },
  },
];

export function isDocSlug(s: string): s is DocSlug {
  return DOC_NAV.some((x) => x.slug === s);
}

export function getNavItem(slug: DocSlug): DocNavItem | undefined {
  return DOC_NAV.find((x) => x.slug === slug);
}
