import type { JSONContent } from "@tiptap/react";

/** Пустой документ в формате со страницами. */
export const EMPTY_DOC_JSON: JSONContent = {
  type: "doc",
  content: [{ type: "docPage", content: [{ type: "paragraph" }] }],
};

/**
 * Старый формат: doc → block* (с pageBreak).
 * Новый: doc → docPage+; внутри каждой страницы block+.
 */
export function migrateDocJson(json: JSONContent | null | undefined): JSONContent {
  if (!json || json.type !== "doc") {
    return EMPTY_DOC_JSON;
  }

  const raw = json.content;
  if (!raw?.length) {
    return EMPTY_DOC_JSON;
  }

  if (raw[0]?.type === "docPage") {
    return json;
  }

  const pages: JSONContent[] = [];
  let current: JSONContent[] = [];

  const flushPage = () => {
    if (!current.length) {
      current = [{ type: "paragraph" }];
    }
    pages.push({ type: "docPage", content: current });
    current = [];
  };

  for (const node of raw) {
    if (node.type === "pageBreak") {
      flushPage();
    } else {
      current.push(node);
    }
  }
  flushPage();

  return { type: "doc", content: pages };
}

/** Обёртка для HTML/setContent: один лист с контентом. */
export function wrapHtmlInDocPage(html: string): string {
  const trimmed = html.trim();
  if (trimmed.includes('data-type="doc-page"')) return html || '<div data-type="doc-page"><p></p></div>';
  const inner = trimmed || "<p></p>";
  return `<div data-type="doc-page">${inner}</div>`;
}

/** Для экспорта DOCX: снова плоский поток + разрывы между бывшими страницами. */
export function flattenDocPagesForExport(content: JSONContent[] | undefined): JSONContent[] {
  if (!content?.length) return [];
  const out: JSONContent[] = [];
  for (let i = 0; i < content.length; i++) {
    const n = content[i];
    if (n.type === "docPage") {
      const inner = n.content || [];
      out.push(...inner);
      if (i < content.length - 1) {
        out.push({ type: "pageBreak" });
      }
    } else {
      out.push(n);
    }
  }
  return out;
}
