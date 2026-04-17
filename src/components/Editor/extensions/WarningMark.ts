import { Mark, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    warningMark: {
      setWarningMark: (attrs: { warningKey: string; message: string }) => ReturnType;
      unsetWarningMark: () => ReturnType;
    };
  }
}

export const WarningMark = Mark.create({
  name: "warning",
  inclusive: false,

  addAttributes() {
    return {
      warningKey: {
        default: "",
      },
      message: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-warning-key]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-warning-key": HTMLAttributes.warningKey,
        "data-warning-message": HTMLAttributes.message,
        class: "warning-mark",
        title: HTMLAttributes.message,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setWarningMark:
        (attrs) =>
        ({ commands }) =>
          commands.setMark(this.name, attrs),
      unsetWarningMark:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});
