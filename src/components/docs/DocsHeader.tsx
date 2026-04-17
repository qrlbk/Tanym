import Link from "next/link";

import type { DocsLocale } from "@/lib/docs/constants";
import { DocsLanguageSwitcher } from "./DocsLanguageSwitcher";
import type { DocSlug } from "@/lib/docs/registry";

type Props = {
  locale: DocsLocale;
  slug?: DocSlug;
};

const SUBTITLE: Record<DocsLocale, string> = {
  en: "Documentation",
  ru: "Документация",
  kk: "Құжаттама",
};

export function DocsHeader({ locale, slug }: Props) {
  return (
    <header className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <Link
          href="/"
          className="text-[11px] font-medium uppercase tracking-wider text-zinc-500 transition-colors hover:text-zinc-300"
        >
          ← Tanym
        </Link>
        <div className="mt-1 flex flex-wrap items-baseline gap-2">
          <Link href={`/docs/${locale}`} className="text-lg font-semibold text-white">
            {SUBTITLE[locale]}
          </Link>
        </div>
      </div>
      <DocsLanguageSwitcher locale={locale} slug={slug} />
    </header>
  );
}
