import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { buildStoryOutlineFromDoc } from "@/lib/story/outline";
import { usePlotStoryStore } from "@/stores/plotStoryStore";
import { useUIStore } from "@/stores/uiStore";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    continuityMarkers: {
      refreshContinuityMarkers: () => ReturnType;
    };
  }
}

export const continuityMarkersKey = new PluginKey("continuityMarkers");
export const CONTINUITY_MARKERS_REFRESH = "continuityMarkersRefresh";

function getUnresolvedBySceneId() {
  const { consistencyWarnings, warningStatuses, chunkSceneMap } =
    usePlotStoryStore.getState();
  const unresolvedBySceneId = new Map<string, number>();
  for (const warning of consistencyWarnings) {
    const status = warningStatuses[warning.key] ?? "new";
    if (status === "resolved" || status === "ignored") continue;
    for (const chunkId of warning.newChunkIds) {
      const sceneId = chunkSceneMap[chunkId]?.sceneId;
      if (!sceneId) continue;
      unresolvedBySceneId.set(sceneId, (unresolvedBySceneId.get(sceneId) ?? 0) + 1);
    }
  }
  return unresolvedBySceneId;
}

function buildDecorationSet(doc: Parameters<typeof buildStoryOutlineFromDoc>[0]) {
  const outline = buildStoryOutlineFromDoc(doc);
  const unresolvedBySceneId = getUnresolvedBySceneId();
  const decorations: Decoration[] = [];

  for (const chapter of outline.chapters) {
    for (const scene of chapter.scenes) {
      const unresolved = unresolvedBySceneId.get(scene.id) ?? 0;
      if (unresolved <= 0) continue;
      const headingNode = doc.nodeAt(scene.from);
      if (!headingNode || headingNode.type.name !== "heading") continue;
      const from = scene.from + 1;
      const to = scene.from + headingNode.nodeSize - 1;
      if (to <= from) continue;
      decorations.push(
        Decoration.inline(from, to, {
          class: "continuity-heading-hl",
          "data-scene-id": scene.id,
          "data-continuity-unresolved": String(unresolved),
          title:
            unresolved === 1
              ? "1 нерешенный конфликт в этой сцене"
              : `${unresolved} нерешенных конфликтов в этой сцене`,
        }),
      );
      decorations.push(
        Decoration.widget(from, () => {
          const el = document.createElement("button");
          el.type = "button";
          el.className = "continuity-scene-marker";
          el.dataset.sceneId = scene.id;
          el.textContent = String(unresolved);
          el.title =
            unresolved === 1
              ? "Открыть конфликт этой сцены"
              : `Открыть конфликты сцены (${unresolved})`;
          return el;
        }),
      );
    }
  }

  return DecorationSet.create(doc, decorations);
}

export const ContinuityMarkers = Extension.create({
  name: "continuityMarkers",

  addCommands() {
    return {
      refreshContinuityMarkers:
        () =>
        ({ tr, dispatch }) => {
          if (!dispatch) return true;
          dispatch(tr.setMeta(CONTINUITY_MARKERS_REFRESH, true));
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: continuityMarkersKey,
        state: {
          init: (_, state) => buildDecorationSet(state.doc),
          apply(tr, old, _oldState, newState) {
            if (!tr.docChanged && !tr.getMeta(CONTINUITY_MARKERS_REFRESH)) {
              return old;
            }
            return buildDecorationSet(newState.doc);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
          handleClick: (_view, _pos, event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return false;
            const holder = target.closest<HTMLElement>("[data-scene-id]");
            const sceneId = holder?.dataset.sceneId;
            if (!sceneId) return false;
            const ui = useUIStore.getState();
            ui.setActiveSceneId(sceneId);
            ui.setWriterFocusMode("continuity");
            ui.setContinuityFilter("all");
            ui.setShowPlotPanel(true);
            ui.setRightPanelTab("story");
            return false;
          },
        },
      }),
    ];
  },
});
