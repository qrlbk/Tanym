import Link from "next/link";

import type { DocsLocale } from "@/lib/docs/constants";
import { DOCS_LOCALES } from "@/lib/docs/registry";
import type { DocSlug } from "@/lib/docs/registry";

const LABELS: Record<DocsLocale, string> = {
  en: "EN",
  ru: "RU",
  kk: "KK",
};

type Props = {
  locale: DocsLocale;
  slug?: DocSlug;
};

export function DocsLanguageSwitcher({ locale, slug }: Props) {
  const suffix = slug ? `/${slug}` : "";
  return (
    <div
      className="inline-flex rounded-lg border border-white/10 bg-black/20 p-0.5"
      role="group"
      aria-label="Documentation language"
    >
      {DOCS_LOCALES.map((loc) => {
        const active = loc === locale;
        return (
          <Link
            key={loc}
            href={`/docs/${loc}${suffix}`}
            className={[
              "rounded-md px-3 py-1.5 text-[12px] font-semibold tracking-wide transition-colors",
              active
                ? "bg-white/12 text-white shadow-sm"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
            ].join(" ")}
            hrefLang={loc}
            lang={loc}
          >
            {LABELS[loc]}
          </Link>
        );
      })}
    </div>
  );
}
