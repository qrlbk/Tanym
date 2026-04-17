import type { Node as PMNode, Mark } from "@tiptap/pm/model";
import { fnv1aHash, stableJoin } from "./hash";

const INVISIBLE_CHARS_RE = /[\u200B-\u200D\uFEFF]/g;
const WHITESPACE_RE = /\s+/g;

function normalizeText(input: string): string {
  return input.replace(INVISIBLE_CHARS_RE, "").replace(WHITESPACE_RE, " ").trim();
}

function serializeAttrs(attrs: Record<string, unknown>): string {
  return Object.keys(attrs)
    .sort()
    .map((k) => `${k}:${String(attrs[k])}`)
    .join(",");
}

function serializeMark(mark: Mark): string {
  return `${mark.type.name}(${serializeAttrs(mark.attrs as Record<string, unknown>)})`;
}

function collectSortedInlineMarks(node: PMNode): string[] {
  const marks: string[] = [];
  node.descendants((desc) => {
    if (!desc.isText || !desc.marks.length) return true;
    for (const mark of desc.marks) {
      marks.push(serializeMark(mark));
    }
    return true;
  });
  marks.sort();
  return marks;
}

function getLayoutSemanticType(node: PMNode): string {
  const attrs = node.attrs as Record<string, unknown>;
  switch (node.type.name) {
    case "heading":
      return `heading:${String(attrs.level ?? "")}`;
    case "orderedList":
      return `orderedList:${String(attrs.start ?? 1)}`;
    case "bulletList":
    case "paragraph":
    case "blockquote":
    case "listItem":
    case "taskItem":
    case "table":
      return node.type.name;
    default:
      return `${node.type.name}:${serializeAttrs(attrs)}`;
  }
}

export function computeContentHash(node: PMNode): string {
  const normalizedText = normalizeText(node.textContent);
  const marks = collectSortedInlineMarks(node).join(";");
  const semanticType = getLayoutSemanticType(node);
  return fnv1aHash(stableJoin([normalizedText, marks, semanticType]));
}

