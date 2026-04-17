import { Node, mergeAttributes, Extension } from "@tiptap/core";
import type { EditorState } from "@tiptap/pm/state";

export type DocPageVariant = "default" | "soft" | "tinted" | "minimal";

export const DocPage = Node.create({
  name: "docPage",
  content: "block+",
  defining: true,
  isolating: true,

  addAttributes() {
    return {
      pageVariant: {
        default: "default" as DocPageVariant,
        parseHTML: (element) => {
          const v = element.getAttribute("data-page-variant");
          if (
            v === "soft" ||
            v === "tinted" ||
            v === "minimal" ||
            v === "default"
          ) {
            return v;
          }
          return "default";
        },
        renderHTML: (attributes) => {
          const v = attributes.pageVariant as DocPageVariant | undefined;
          if (!v || v === "default") return {};
          return { "data-page-variant": v };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="doc-page"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "doc-page",
        class: "doc-page-sheet",
      }),
      ["div", { class: "doc-page-body" }, 0],
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const sheet = document.createElement("div");
      sheet.className = "doc-page-sheet";
      sheet.setAttribute("data-type", "doc-page");
      const variant = (node.attrs.pageVariant as DocPageVariant) || "default";
      if (variant !== "default") {
        sheet.setAttribute("data-page-variant", variant);
      }

      const body = document.createElement("div");
      body.className = "doc-page-body";
      sheet.appendChild(body);

      const applyVariant = (v: DocPageVariant) => {
        if (v === "default") sheet.removeAttribute("data-page-variant");
        else sheet.setAttribute("data-page-variant", v);
      };
      applyVariant(variant);

      return {
        dom: sheet,
        contentDOM: body,
        update: (updatedNode) => {
          if (updatedNode.type.name !== "docPage") return false;
          applyVariant(
            (updatedNode.attrs.pageVariant as DocPageVariant) || "default",
          );
          return true;
        },
      };
    };
  },

});

/** Команды и шорткаты отдельно — иначе типы Node.addCommands в TipTap 3 конфликтуют. */
export const DocPageCommands = Extension.create({
  name: "docPageCommands",

  addCommands() {
    return {
      insertDocPageAfter:
        () =>
        (ctx: { state: EditorState; chain: () => Record<string, unknown> }) => {
          const { state, chain } = ctx;
          const { $from } = state.selection;
          for (let d = $from.depth; d > 0; d--) {
            if ($from.node(d).type.name !== "docPage") continue;
            const after = $from.after(d);
            const ch = chain() as {
              insertContentAt: (
                p: number,
                c: Record<string, unknown>,
              ) => { focus: (p: number) => { run: () => boolean } };
            };
            return ch
              .insertContentAt(after, {
                type: "docPage",
                content: [{ type: "paragraph" }],
              })
              .focus(after + 2)
              .run();
          }
          return false;
        },
    } as never;
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Enter": () =>
        (this.editor.commands as unknown as { insertDocPageAfter: () => boolean })
          .insertDocPageAfter(),
    };
  },
});
