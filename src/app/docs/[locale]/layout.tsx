import { notFound } from "next/navigation";

import { isDocsLocale } from "@/lib/docs/constants";

export default async function DocsLocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!isDocsLocale(locale)) {
    notFound();
  }
  return children;
}
