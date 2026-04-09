import { Extension } from "@tiptap/react";

export const Indent = Extension.create({
  name: "indent",
  addOptions() {
    return { types: ["paragraph", "heading"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          marginLeft: {
            default: null,
            parseHTML: (element: HTMLElement) =>
              element.style.marginLeft || null,
            renderHTML: (attributes: Record<string, unknown>) => {
              if (!attributes.marginLeft) return {};
              return { style: `margin-left: ${attributes.marginLeft}` };
            },
          },
          marginRight: {
            default: null,
            parseHTML: (element: HTMLElement) =>
              element.style.marginRight || null,
            renderHTML: (attributes: Record<string, unknown>) => {
              if (!attributes.marginRight) return {};
              return { style: `margin-right: ${attributes.marginRight}` };
            },
          },
          textIndent: {
            default: null,
            parseHTML: (element: HTMLElement) =>
              element.style.textIndent || null,
            renderHTML: (attributes: Record<string, unknown>) => {
              if (!attributes.textIndent) return {};
              return { style: `text-indent: ${attributes.textIndent}` };
            },
          },
        },
      },
    ];
  },
});
