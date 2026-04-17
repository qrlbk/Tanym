import Link from "next/link";

import type { DocsLocale } from "@/lib/docs/constants";
import { DOC_NAV } from "@/lib/docs/registry";

type Props = {
  locale: DocsLocale;
};

const INTRO: Record<DocsLocale, string> = {
  en: "Guides for developers and maintainers. Choose a topic:",
  ru: "Материалы для разработчиков и мейнтейнеров. Выберите раздел:",
  kk: "Әзірлеушілер мен мейнтейнерлерге арналған нұсқаулар. Тақырыпты таңдаңыз:",
};

export function DocsIndex({ locale }: Props) {
  return (
    <div className="space-y-6">
      <p className="text-[15px] leading-relaxed text-zinc-400">{INTRO[locale]}</p>
      <ul className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
        {DOC_NAV.map((item) => (
          <li key={item.slug}>
            <Link
              href={`/docs/${locale}/${item.slug}`}
              className="block rounded-xl border border-white/10 bg-white/[0.03] px-4 py-4 transition-colors hover:border-sky-500/30 hover:bg-sky-500/5"
            >
              <span className="text-[15px] font-medium text-white">
                {item.titles[locale]}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
