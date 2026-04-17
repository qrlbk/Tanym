import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DocsMarkdown } from "@/components/docs/DocsMarkdown";
import { DocsShell } from "@/components/docs/DocsShell";
import type { DocsLocale } from "@/lib/docs/constants";
import { isDocsLocale } from "@/lib/docs/constants";
import { loadDocMarkdown } from "@/lib/docs/load-doc";
import {
  DOC_NAV,
  DOCS_LOCALES,
  type DocSlug,
  getNavItem,
  isDocSlug,
} from "@/lib/docs/registry";

export function generateStaticParams() {
  const out: { locale: string; slug: string }[] = [];
  for (const locale of DOCS_LOCALES) {
    for (const item of DOC_NAV) {
      out.push({ locale, slug: item.slug });
    }
  }
  return out;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale: raw, slug } = await params;
  if (!isDocsLocale(raw) || !isDocSlug(slug)) {
    return { title: "Tanym" };
  }
  const locale = raw as DocsLocale;
  const nav = getNavItem(slug);
  const title = nav ? `${nav.titles[locale]} · Tanym` : "Tanym";
  return { title };
}

export default async function DocsArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isDocsLocale(raw) || !isDocSlug(slug)) {
    notFound();
  }
  const locale = raw as DocsLocale;
  const loaded = loadDocMarkdown(locale, slug);
  if (!loaded) {
    notFound();
  }

  const nav = getNavItem(slug);
  const fallbackBanner =
    loaded.usedFallback && loaded.sourceLocale === "en" && locale !== "en" ? (
      <div
        className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[13px] text-amber-100/95"
        role="status"
      >
        {locale === "kk"
          ? "Бұл бет ағылшын тілінде көрсетілуде — қазақша аударма әлі дайын емес."
          : locale === "ru"
            ? "Эта страница пока на английском — русский перевод ещё не добавлен."
            : "This page is shown in English because a translation is not available yet."}
      </div>
    ) : null;

  return (
    <DocsShell locale={locale} slug={slug}>
      {fallbackBanner}
      <article
        className={[
          "docs-prose prose prose-invert max-w-none",
          "prose-headings:scroll-mt-24 prose-headings:font-semibold",
          "prose-a:text-sky-400 prose-a:no-underline hover:prose-a:underline",
          "prose-code:rounded prose-code:bg-white/10 prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.9em]",
          "prose-pre:bg-zinc-900/80 prose-pre:border prose-pre:border-white/10",
        ].join(" ")}
      >
        <DocsMarkdown markdown={loaded.markdown} />
      </article>
    </DocsShell>
  );
}
