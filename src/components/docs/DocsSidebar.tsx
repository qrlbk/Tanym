import Link from "next/link";

import type { DocsLocale } from "@/lib/docs/constants";
import { DOC_NAV } from "@/lib/docs/registry";

type Props = {
  locale: DocsLocale;
};

export function DocsSidebar({ locale }: Props) {
  return (
    <nav
      className="space-y-0.5 border-b border-white/10 pb-6 md:border-b-0 md:pb-0"
      aria-label="Documentation sections"
    >
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
        {locale === "en"
          ? "Topics"
          : locale === "ru"
            ? "Разделы"
            : "Тақырыптар"}
      </p>
      <ul className="space-y-0.5">
        {DOC_NAV.map((item) => (
          <li key={item.slug}>
            <Link
              href={`/docs/${locale}/${item.slug}`}
              className="block rounded-md px-2 py-1.5 text-[13px] text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
            >
              {item.titles[locale]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
