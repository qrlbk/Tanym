import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    searchHighlight: {
      setSearchHighlight: (opts: {
        query: string;
        matchCase: boolean;
        wholeWord: boolean;
      }) => ReturnType;
    };
  }
  interface Storage {
    searchHighlight: {
      query: string;
      matchCase: boolean;
      wholeWord: boolean;
    };
  }
}
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { collectTextMatches } from "@/lib/find-utils";

export const searchHighlightKey = new PluginKey("searchHighlight");
export const SEARCH_HIGHLIGHT_UPDATE = "searchHighlightUpdate";

function buildDecorationSet(
  doc: Parameters<typeof collectTextMatches>[0],
  query: string,
  matchCase: boolean,
  wholeWord: boolean,
): DecorationSet {
  if (!query.trim()) return DecorationSet.empty;
  const matches = collectTextMatches(doc, query, matchCase, wholeWord);
  const deco = matches.map((m) =>
    Decoration.inline(m.from, m.to, { class: "search-match-hl" }),
  );
  return DecorationSet.create(doc, deco);
}

export const SearchHighlight = Extension.create({
  name: "searchHighlight",

  addStorage() {
    return {
      query: "",
      matchCase: false,
      wholeWord: false,
    };
  },

  addCommands() {
    return {
      setSearchHighlight:
        (opts: { query: string; matchCase: boolean; wholeWord: boolean }) =>
        ({ tr, dispatch, editor }) => {
          const s = editor.storage.searchHighlight;
          if (!s) return false;
          s.query = opts.query;
          s.matchCase = opts.matchCase;
          s.wholeWord = opts.wholeWord;
          if (dispatch) {
            tr.setMeta(SEARCH_HIGHLIGHT_UPDATE, true);
            dispatch(tr);
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const extension = this;
    return [
      new Plugin({
        key: searchHighlightKey,
        state: {
          init: (_, { doc }) =>
            buildDecorationSet(
              doc,
              extension.storage.query,
              extension.storage.matchCase,
              extension.storage.wholeWord,
            ),
          apply(tr, prev, _oldState, newState) {
            if (!tr.docChanged && !tr.getMeta(SEARCH_HIGHLIGHT_UPDATE)) {
              return prev;
            }
            return buildDecorationSet(
              newState.doc,
              extension.storage.query,
              extension.storage.matchCase,
              extension.storage.wholeWord,
            );
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});
