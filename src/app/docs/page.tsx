import { redirect } from "next/navigation";

import { DEFAULT_DOCS_LOCALE } from "@/lib/docs/constants";

export default function DocsRootPage() {
  redirect(`/docs/${DEFAULT_DOCS_LOCALE}`);
}
