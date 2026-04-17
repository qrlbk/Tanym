import type { ReactNode } from "react";

import type { DocsLocale } from "@/lib/docs/constants";
import type { DocSlug } from "@/lib/docs/registry";
import { DocsHeader } from "./DocsHeader";
import { DocsSidebar } from "./DocsSidebar";

type Props = {
  locale: DocsLocale;
  slug?: DocSlug;
  children: ReactNode;
};

export function DocsShell({ locale, slug, children }: Props) {
  return (
    <div
      lang={locale}
      className="fixed inset-0 z-[100] overflow-y-auto bg-[#0c0e11] text-zinc-200"
      style={{
        fontFamily:
          'Inter, system-ui, "Noto Sans", "Noto Sans Kazakh", sans-serif',
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:flex-row md:gap-10 md:px-6 lg:py-10">
        <aside className="shrink-0 md:w-52 lg:w-56">
          <DocsSidebar locale={locale} />
        </aside>
        <div className="min-w-0 flex-1">
          <DocsHeader locale={locale} slug={slug} />
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
