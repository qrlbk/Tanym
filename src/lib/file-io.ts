import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table as DocxTable,
  TableRow as DocxTableRow,
  TableCell as DocxTableCell,
  WidthType,
  AlignmentType,
  ExternalHyperlink,
  BorderStyle,
} from "docx";
import { saveAs } from "file-saver";
import mammoth from "mammoth";
import type { Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/react";
import { flattenDocPagesForExport, migrateDocJson } from "@/lib/migrate-doc-pages";
import { isTauri, tauriSaveDialog, tauriWriteFile } from "./tauri-helpers";
import type { StoryProject } from "@/lib/project/types";

function getAlignmentType(align?: string): (typeof AlignmentType)[keyof typeof AlignmentType] | undefined {
  switch (align) {
    case "left": return AlignmentType.LEFT;
    case "center": return AlignmentType.CENTER;
    case "right": return AlignmentType.RIGHT;
    case "justify": return AlignmentType.JUSTIFIED;
    default: return undefined;
  }
}

function getHeadingLevel(level: number): (typeof HeadingLevel)[keyof typeof HeadingLevel] | undefined {
  const map: Record<number, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
    1: HeadingLevel.HEADING_1,
    2: HeadingLevel.HEADING_2,
    3: HeadingLevel.HEADING_3,
    4: HeadingLevel.HEADING_4,
    5: HeadingLevel.HEADING_5,
    6: HeadingLevel.HEADING_6,
  };
  return map[level];
}

function hexToDocxColor(hex: string): string {
  return hex.replace("#", "").toUpperCase();
}

function processInlineContent(content?: JSONContent[]): (TextRun | ExternalHyperlink)[] {
  if (!content) return [new TextRun("")];
  const runs: (TextRun | ExternalHyperlink)[] = [];

  for (const node of content) {
    if (node.type === "text") {
      const marks = node.marks || [];
      const isBold = marks.some((m) => m.type === "bold");
      const isItalic = marks.some((m) => m.type === "italic");
      const isUnderline = marks.some((m) => m.type === "underline");
      const isStrike = marks.some((m) => m.type === "strike");
      const isSub = marks.some((m) => m.type === "subscript");
      const isSup = marks.some((m) => m.type === "superscript");

      const textStyleMark = marks.find((m) => m.type === "textStyle");
      const fontSize = textStyleMark?.attrs?.fontSize
        ? parseInt(textStyleMark.attrs.fontSize)
        : undefined;
      const fontFamily = textStyleMark?.attrs?.fontFamily as string | undefined;
      const fontColor = textStyleMark?.attrs?.color as string | undefined;

      const colorMark = marks.find((m) => m.type === "textStyle" && m.attrs?.color);
      const color = colorMark?.attrs?.color || fontColor;

      const highlightMark = marks.find((m) => m.type === "highlight");
      const highlightColor = highlightMark?.attrs?.color as string | undefined;

      const linkMark = marks.find((m) => m.type === "link");

      const textRunOptions: Record<string, unknown> = {
        text: node.text || "",
        bold: isBold || undefined,
        italics: isItalic || undefined,
        underline: isUnderline ? {} : undefined,
        strike: isStrike || undefined,
        subScript: isSub || undefined,
        superScript: isSup || undefined,
        size: fontSize ? fontSize * 2 : undefined,
        font: fontFamily || undefined,
        color: color ? hexToDocxColor(color) : undefined,
        shading: highlightColor
          ? { fill: hexToDocxColor(highlightColor) }
          : undefined,
      };

      if (linkMark?.attrs?.href) {
        runs.push(
          new ExternalHyperlink({
            link: linkMark.attrs.href as string,
            children: [
              new TextRun({
                ...textRunOptions,
                style: "Hyperlink",
              } as ConstructorParameters<typeof TextRun>[0]),
            ],
          })
        );
      } else {
        runs.push(new TextRun(textRunOptions as ConstructorParameters<typeof TextRun>[0]));
      }
    }
  }

  return runs.length > 0 ? runs : [new TextRun("")];
}

function cellBlocksToParagraphs(blocks: JSONContent[] | undefined): Paragraph[] {
  if (!blocks?.length) return [new Paragraph("")];
  const out: Paragraph[] = [];
  for (const block of blocks) {
    if (block.type === "paragraph") {
      out.push(
        new Paragraph({
          children: processInlineContent(block.content),
          alignment: getAlignmentType(block.attrs?.textAlign as string | undefined),
        }),
      );
    } else if (block.type === "heading") {
      const level = block.attrs?.level || 1;
      out.push(
        new Paragraph({
          heading: getHeadingLevel(level),
          children: processInlineContent(block.content),
          alignment: getAlignmentType(block.attrs?.textAlign as string | undefined),
        }),
      );
    } else {
      out.push(new Paragraph(""));
    }
  }
  return out.length > 0 ? out : [new Paragraph("")];
}

function cellJsonToDocxCell(cell: JSONContent): DocxTableCell {
  const attrs = cell.attrs ?? {};
  const colspan = Math.max(1, Number(attrs.colspan) || 1);
  const rowspan = Math.max(1, Number(attrs.rowspan) || 1);
  const borderMode = attrs.borderMode as string | undefined;
  const cellBackground = attrs.cellBackground as string | undefined;

  const paras = cellBlocksToParagraphs(cell.content);

  const shading =
    cellBackground &&
    typeof cellBackground === "string" &&
    cellBackground.startsWith("#")
      ? { fill: hexToDocxColor(cellBackground) }
      : undefined;

  const nilSide = {
    style: BorderStyle.NIL,
    size: 0,
    color: "FFFFFF",
  };
  const borders =
    borderMode === "none"
      ? {
          top: nilSide,
          bottom: nilSide,
          left: nilSide,
          right: nilSide,
        }
      : undefined;

  return new DocxTableCell({
    children: paras,
    columnSpan: colspan > 1 ? colspan : undefined,
    rowSpan: rowspan > 1 ? rowspan : undefined,
    shading,
    borders,
    width: { size: 0, type: WidthType.AUTO },
  });
}

/** Ширины колонок в DXA (условно px×15, как отступ в `tableIndent`). */
function columnWidthsTwipsFromTableJson(node: JSONContent): number[] | undefined {
  const firstRow = node.content?.[0];
  if (!firstRow?.content?.length) return undefined;
  const widths: number[] = [];
  for (const cell of firstRow.content) {
    const cw = cell.attrs?.colwidth as number[] | null | undefined;
    const cs = Math.max(1, Number(cell.attrs?.colspan) || 1);
    if (cw?.length) {
      for (let i = 0; i < cs; i++) {
        const px = cw[Math.min(i, cw.length - 1)] ?? 72;
        widths.push(Math.max(0, Math.round(Number(px) * 15)));
      }
    } else {
      for (let i = 0; i < cs; i++) widths.push(0);
    }
  }
  if (widths.length === 0) return undefined;
  if (widths.every((w) => w === 0)) return undefined;
  return widths;
}

function jsonToDocxElements(content: JSONContent[]): (Paragraph | DocxTable)[] {
  const elements: (Paragraph | DocxTable)[] = [];

  for (const node of content) {
    if (node.type === "docPage") {
      elements.push(...jsonToDocxElements(node.content || []));
    } else if (node.type === "paragraph") {
      elements.push(
        new Paragraph({
          children: processInlineContent(node.content),
          alignment: getAlignmentType(node.attrs?.textAlign),
        })
      );
    } else if (node.type === "heading") {
      const level = node.attrs?.level || 1;
      elements.push(
        new Paragraph({
          heading: getHeadingLevel(level),
          children: processInlineContent(node.content),
          alignment: getAlignmentType(node.attrs?.textAlign),
        })
      );
    } else if (node.type === "bulletList" || node.type === "orderedList") {
      const items = node.content || [];
      for (const item of items) {
        const paraContent = item.content?.[0]?.content;
        elements.push(
          new Paragraph({
            children: processInlineContent(paraContent),
            bullet: node.type === "bulletList" ? { level: 0 } : undefined,
          })
        );
      }
    } else if (node.type === "table") {
      const rows = (node.content || []).map((row) => {
        const cells = (row.content || []).map((cell) => {
          if (cell.type === "tableCell" || cell.type === "tableHeader") {
            return cellJsonToDocxCell(cell);
          }
          return new DocxTableCell({
            children: [new Paragraph("")],
            width: { size: 0, type: WidthType.AUTO },
          });
        });
        return new DocxTableRow({ children: cells });
      });

      if (rows.length > 0) {
        const ta = node.attrs?.tableAlign as string | undefined;
        const alignment =
          ta === "center"
            ? AlignmentType.CENTER
            : ta === "right"
              ? AlignmentType.RIGHT
              : AlignmentType.LEFT;
        const indentPx = Number(node.attrs?.tableIndent) || 0;
        const indent =
          indentPx > 0
            ? {
                size: Math.round(indentPx * 15),
                type: WidthType.DXA,
              }
            : undefined;

        const columnWidths = columnWidthsTwipsFromTableJson(node);

        elements.push(
          new DocxTable({
            rows,
            alignment,
            ...(indent ? { indent } : {}),
            ...(columnWidths ? { columnWidths } : {}),
          }),
        );
      }
    } else if (node.type === "horizontalRule") {
      elements.push(new Paragraph({ thematicBreak: true }));
    } else if (node.type === "pageBreak") {
      elements.push(
        new Paragraph({
          children: [new TextRun({ break: 1 })],
          pageBreakBefore: true,
        }),
      );
    } else if (node.type === "blockquote") {
      const inner = node.content || [];
      for (const child of inner) {
        elements.push(
          new Paragraph({
            children: processInlineContent(child.content),
            indent: { left: 720 },
          })
        );
      }
    }
  }

  return elements;
}

export async function buildEditorDocxBlob(editor: Editor): Promise<Blob> {
  const json = migrateDocJson(editor.getJSON());
  const content = flattenDocPagesForExport(json.content);
  const children = jsonToDocxElements(content);
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children.length > 0 ? children : [new Paragraph("")],
      },
    ],
  });
  return Packer.toBlob(doc);
}

export async function buildProjectDocxBlob(project: StoryProject): Promise<Blob> {
  const content: JSONContent[] = [];
  for (const chapter of project.chapters) {
    content.push({
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: chapter.title }],
    });
    for (const scene of chapter.scenes) {
      content.push({
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: scene.title }],
      });
      const sceneBlocks = scene.content.content ?? [];
      content.push(...sceneBlocks);
    }
  }
  const children = jsonToDocxElements(content);
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children.length > 0 ? children : [new Paragraph("")],
      },
    ],
  });
  return Packer.toBlob(doc);
}

export async function exportToDocx(editor: Editor, filename: string) {
  const blob = await buildEditorDocxBlob(editor);
  const safeName = filename.endsWith(".docx") ? filename : `${filename}.docx`;

  if (isTauri()) {
    const path = await tauriSaveDialog(safeName);
    if (path) {
      const buf = new Uint8Array(await blob.arrayBuffer());
      const wr = await tauriWriteFile(path, buf);
      if (!wr.ok) {
        console.warn("exportToDocx: write failed", wr.message);
      }
    }
  } else {
    saveAs(blob, safeName);
  }
}

export async function exportProjectToDocx(project: StoryProject, filename: string) {
  const blob = await buildProjectDocxBlob(project);
  const safeName = filename.endsWith(".docx") ? filename : `${filename}.docx`;
  if (isTauri()) {
    const path = await tauriSaveDialog(safeName);
    if (path) {
      const buf = new Uint8Array(await blob.arrayBuffer());
      const wr = await tauriWriteFile(path, buf);
      if (!wr.ok) {
        console.warn("exportProjectToDocx: write failed", wr.message);
      }
    }
  } else {
    saveAs(blob, safeName);
  }
}

function normalizeImportedHtml(html: string): string {
  if (typeof window === "undefined") return html;

  const doc = new DOMParser().parseFromString(html, "text/html");

  // Таблицы из типичных DOCX часто тащат <colgroup>/<col> с px-ширинами — лист сжимается в узкую колонку.
  doc.querySelectorAll("colgroup").forEach((cg) => cg.remove());
  doc.querySelectorAll("table col").forEach((col) => col.remove());

  doc.querySelectorAll("table").forEach((table) => {
    const t = table as HTMLTableElement;
    t.removeAttribute("width");
    t.style.borderCollapse = "collapse";
    t.style.width = "100%";
    t.style.maxWidth = "100%";
    t.style.tableLayout = "fixed";
    t.style.margin = t.style.margin || "8px 0";
  });
  doc.querySelectorAll("td, th").forEach((cell) => {
    const c = cell as HTMLElement;
    c.removeAttribute("width");
    c.style.removeProperty("width");
    c.style.removeProperty("min-width");
    if (!c.style.border) c.style.border = "1px solid #b8b8b8";
    if (!c.style.padding) c.style.padding = "8px 10px";
    if (!c.style.verticalAlign) c.style.verticalAlign = "top";
  });

  // Keep paragraph spacing and alignment attributes if present.
  doc.querySelectorAll("p").forEach((p) => {
    const el = p as HTMLElement;
    if (!el.style.margin) el.style.margin = "0 0 0.35em 0";
    if (!el.style.lineHeight) el.style.lineHeight = "1.2";
  });

  // Ensure empty paragraphs survive parsing.
  doc.querySelectorAll("p").forEach((p) => {
    if (!p.textContent?.trim() && p.children.length === 0) {
      p.innerHTML = "&nbsp;";
    }
  });

  doc.querySelectorAll("br[type='page']").forEach((br) => {
    const pageBreakDiv = doc.createElement("div");
    pageBreakDiv.setAttribute("data-page-break", "");
    pageBreakDiv.className = "page-break-node";
    br.replaceWith(pageBreakDiv);
  });

  return doc.body.innerHTML;
}

export async function importDocx(file: File | ArrayBuffer): Promise<{ html: string; warnings: string[] }> {
  const arrayBuffer = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      includeDefaultStyleMap: true,
      includeEmbeddedStyleMap: true,
      ignoreEmptyParagraphs: false,
      styleMap: [
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Heading 4'] => h4:fresh",
        "p[style-name='Heading 5'] => h5:fresh",
        "p[style-name='Heading 6'] => h6:fresh",
        "p[style-name='Subtitle'] => h2.subtitle:fresh",
        "p[style-name='Quote'] => blockquote:fresh",
        "p[style-name='Intense Quote'] => blockquote.intense:fresh",
        "p[style-name='List Paragraph'] => p.list-paragraph:fresh",
        "r[style-name='Strong'] => strong",
        "r[style-name='Emphasis'] => em",
        "r[style-name='Subtle Emphasis'] => em.subtle",
        "r[style-name='Intense Emphasis'] => strong.intense",
      ],
      convertImage: mammoth.images.imgElement(async (image) => ({
        src: `data:${image.contentType};base64,${await image.read("base64")}`,
      })),
    }
  );

  const warnings = result.messages.map((m) => `${m.type}: ${m.message}`);
  const html = normalizeImportedHtml(result.value);
  return { html, warnings };
}

export function exportToPdf() {
  window.print();
}
