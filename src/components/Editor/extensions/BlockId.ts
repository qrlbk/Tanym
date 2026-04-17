import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, EditorState, Transaction } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";

const BLOCK_ID_ATTR = "blockId";
const BLOCK_ID_META = "blockIdNormalization";
const blockIdPluginKey = new PluginKey("block-id-normalizer");

function generateBlockId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function isNormalizableBlock(node: PMNode): boolean {
  return (
    node.isBlock &&
    node.type.name !== "docPage" &&
    node.type.name !== "doc" &&
    node.type.name !== "table" &&
    node.type.name !== "image" &&
    node.type.name !== "horizontalRule"
  );
}

/** Top-level block means direct child of `doc` (unpaged scene mode) or `docPage` (paged mode). */
function isTopLevelParent(parentName: string | undefined): boolean {
  return parentName === "docPage" || parentName === "doc";
}

function normalizeBlockIdsTransaction(state: EditorState): Transaction | null {
  const tr = state.tr;
  const seen = new Set<string>();
  let changed = false;
  const targets: Array<{ node: PMNode; pos: number }> = [];
  state.doc.descendants((node, pos, parent) => {
    if (isTopLevelParent(parent?.type.name) && isNormalizableBlock(node)) {
      targets.push({ node, pos });
      return false;
    }
    return true;
  });

  for (const { node, pos } of targets) {
    const attrs = node.attrs as Record<string, unknown>;
    const existing =
      typeof attrs[BLOCK_ID_ATTR] === "string"
        ? (attrs[BLOCK_ID_ATTR] as string)
        : "";

    if (!existing || seen.has(existing)) {
      const nextId = generateBlockId();
      const mappedPos = tr.mapping.map(pos, 1);
      const mappedNode = tr.doc.nodeAt(mappedPos);
      if (!mappedNode || mappedNode.type !== node.type) continue;
      try {
        tr.setNodeMarkup(mappedPos, node.type, {
          ...attrs,
          [BLOCK_ID_ATTR]: nextId,
        });
      } catch {
        continue;
      }
      seen.add(nextId);
      changed = true;
      continue;
    }

    seen.add(existing);
  }

  if (!changed) return null;
  tr.setMeta(BLOCK_ID_META, true);
  return tr;
}

export const BlockId = Extension.create({
  name: "blockId",

  addGlobalAttributes() {
    return [
      {
        types: [
          "paragraph",
          "heading",
          "blockquote",
          "codeBlock",
          "bulletList",
          "orderedList",
          "taskList",
        ],
        attributes: {
          [BLOCK_ID_ATTR]: {
            default: null,
            parseHTML: (element: HTMLElement) =>
              element.getAttribute("data-block-id"),
            renderHTML: (attributes: Record<string, unknown>) => {
              const blockId = attributes[BLOCK_ID_ATTR];
              if (typeof blockId !== "string" || !blockId) return {};
              return { "data-block-id": blockId };
            },
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: blockIdPluginKey,
        appendTransaction: (transactions, _oldState, newState) => {
          if (!transactions.some((tr) => tr.docChanged)) return null;
          if (transactions.some((tr) => tr.getMeta(BLOCK_ID_META))) return null;
          return normalizeBlockIdsTransaction(newState);
        },
      }),
    ];
  },
});

