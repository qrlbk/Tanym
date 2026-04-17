import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DocsIndex } from "@/components/docs/DocsIndex";
import { DocsShell } from "@/components/docs/DocsShell";
import type { DocsLocale } from "@/lib/docs/constants";
import { isDocsLocale } from "@/lib/docs/constants";
import { DOCS_LOCALES } from "@/lib/docs/registry";

export function generateStaticParams() {
  return DOCS_LOCALES.map((locale) => ({ locale }));
}

const TITLES: Record<DocsLocale, string> = {
  en: "Documentation · Tanym",
  ru: "Документация · Tanym",
  kk: "Құжаттама · Tanym",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = isDocsLocale(raw) ? raw : "en";
  return {
    title: TITLES[locale],
    description:
      locale === "en"
        ? "Tanym developer and maintainer documentation."
        : locale === "ru"
          ? "Документация Tanym для разработчиков и мейнтейнеров."
          : "Tanym әзірлеуші құжаттамасы.",
  };
}

export default async function DocsLocaleIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isDocsLocale(raw)) {
    notFound();
  }
  const locale = raw as DocsLocale;
  return (
    <DocsShell locale={locale}>
      <DocsIndex locale={locale} />
    </DocsShell>
  );
}
