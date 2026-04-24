import { create } from "zustand";
import { ZOOM_MIN, ZOOM_MAX } from "@/lib/constants";

export type RibbonTab = "home" | "insert" | "design" | "view";

interface Margins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export type ViewMode = "edit" | "preview";
export type WorkspaceView = "scene" | "preview" | "graph";
export type RightPanelTab = "story" | "ai";
export type WriterFocusMode = "draft" | "rewrite" | "continuity";
export type ContinuityFilter = "all" | "new" | "acknowledged" | "resolved" | "ignored";
/** Light = parchment/off-white sheet; Dark = dark sheet + light text (editor chrome stays dark). */
export type CanvasAppearance = "light" | "dark";
export type SceneTab = { sceneId: string; title: string };

/** Стартовый экран: до входа в рабочую область или после восстановления сессии из хранилища. */
export type StartScreen = "loading" | "welcome" | "editor";

interface UIState {
  activeTab: RibbonTab;
  setActiveTab: (tab: RibbonTab) => void;
  zoom: number;
  setZoom: (zoom: number) => void;
  showRuler: boolean;
  setShowRuler: (show: boolean) => void;
  showFindReplace: boolean;
  setShowFindReplace: (show: boolean) => void;
  orientation: "portrait" | "landscape";
  setOrientation: (orientation: "portrait" | "landscape") => void;
  margins: Margins;
  setMargins: (margins: Margins) => void;
  leftIndent: number;
  setLeftIndent: (indent: number) => void;
  rightIndent: number;
  setRightIndent: (indent: number) => void;
  firstLineIndent: number;
  setFirstLineIndent: (indent: number) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  workspaceView: WorkspaceView;
  setWorkspaceView: (mode: WorkspaceView) => void;
  previewData: ArrayBuffer | null;
  setPreviewData: (data: ArrayBuffer | null) => void;
  /** Пунктир границы области набора внутри полей (показать границы набора). */
  showTextBoundaries: boolean;
  setShowTextBoundaries: (show: boolean) => void;
  /** Ширина области прокрутки холста (для «по ширине окна»). */
  canvasViewportInnerWidth: number;
  setCanvasViewportInnerWidth: (w: number) => void;
  /** Подставить в поле «Найти» при открытии панели (например из контекстного меню). */
  findSeedText: string | null;
  setFindSeedText: (text: string | null) => void;
  showShortcutsHelp: boolean;
  setShowShortcutsHelp: (show: boolean) => void;
  /** Панель индекса сюжета: семантический поиск, факты, граф, чеховские ружья. */
  showPlotPanel: boolean;
  setShowPlotPanel: (show: boolean) => void;
  showChapterNavigator: boolean;
  setShowChapterNavigator: (show: boolean) => void;
  rightPanelTab: RightPanelTab;
  setRightPanelTab: (tab: RightPanelTab) => void;
  writerModeEnabled: boolean;
  setWriterModeEnabled: (enabled: boolean) => void;
  writerFocusMode: WriterFocusMode;
  setWriterFocusMode: (mode: WriterFocusMode) => void;
  activeSceneId: string | null;
  setActiveSceneId: (sceneId: string | null) => void;
  sceneTabs: SceneTab[];
  setSceneTabs: (tabs: SceneTab[]) => void;
  openSceneTab: (tab: SceneTab) => void;
  closeSceneTab: (sceneId: string) => void;
  setSceneTabTitle: (sceneId: string, title: string) => void;
  continuityFilter: ContinuityFilter;
  setContinuityFilter: (filter: ContinuityFilter) => void;
  canvasAppearance: CanvasAppearance;
  setCanvasAppearance: (mode: CanvasAppearance) => void;
  startScreen: StartScreen;
  setStartScreen: (screen: StartScreen) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: "home",
  setActiveTab: (activeTab) => set({ activeTab }),
  zoom: 100,
  setZoom: (zoom) => set({ zoom: Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom)) }),
  showRuler: false,
  setShowRuler: (showRuler) => set({ showRuler }),
  showFindReplace: false,
  setShowFindReplace: (showFindReplace) => set({ showFindReplace }),
  orientation: "portrait",
  setOrientation: (orientation) => set({ orientation }),
  margins: { top: 2, bottom: 2, left: 2, right: 2 },
  setMargins: (margins) => set({ margins }),
  leftIndent: 0,
  setLeftIndent: (leftIndent) => set({ leftIndent }),
  rightIndent: 0,
  setRightIndent: (rightIndent) => set({ rightIndent }),
  firstLineIndent: 0,
  setFirstLineIndent: (firstLineIndent) => set({ firstLineIndent }),
  viewMode: "edit",
  setViewMode: (viewMode) => set({ viewMode }),
  workspaceView: "scene",
  setWorkspaceView: (workspaceView) => set({ workspaceView }),
  previewData: null,
  setPreviewData: (previewData) => set({ previewData }),
  /** По умолчанию — без пунктира вокруг области набора. */
  showTextBoundaries: false,
  setShowTextBoundaries: (showTextBoundaries) => set({ showTextBoundaries }),
  canvasViewportInnerWidth: 0,
  setCanvasViewportInnerWidth: (canvasViewportInnerWidth) =>
    set({ canvasViewportInnerWidth }),
  findSeedText: null,
  setFindSeedText: (findSeedText) => set({ findSeedText }),
  showShortcutsHelp: false,
  setShowShortcutsHelp: (showShortcutsHelp) => set({ showShortcutsHelp }),
  showPlotPanel: false,
  setShowPlotPanel: (showPlotPanel) => set({ showPlotPanel }),
  showChapterNavigator: true,
  setShowChapterNavigator: (showChapterNavigator) => set({ showChapterNavigator }),
  rightPanelTab: "story",
  setRightPanelTab: (rightPanelTab) => set({ rightPanelTab }),
  writerModeEnabled: true,
  setWriterModeEnabled: (writerModeEnabled) => set({ writerModeEnabled }),
  writerFocusMode: "draft",
  setWriterFocusMode: (writerFocusMode) => set({ writerFocusMode }),
  activeSceneId: null,
  setActiveSceneId: (activeSceneId) => set({ activeSceneId }),
  sceneTabs: [],
  setSceneTabs: (sceneTabs) => set({ sceneTabs }),
  openSceneTab: (tab) =>
    set((state) => {
      if (state.sceneTabs.some((t) => t.sceneId === tab.sceneId)) {
        return { ...state, activeSceneId: tab.sceneId };
      }
      return {
        ...state,
        sceneTabs: [...state.sceneTabs, tab],
        activeSceneId: tab.sceneId,
      };
    }),
  closeSceneTab: (sceneId) =>
    set((state) => {
      const nextTabs = state.sceneTabs.filter((tab) => tab.sceneId !== sceneId);
      const nextActive =
        state.activeSceneId === sceneId
          ? (nextTabs[nextTabs.length - 1]?.sceneId ?? null)
          : state.activeSceneId;
      return {
        ...state,
        sceneTabs: nextTabs,
        activeSceneId: nextActive,
      };
    }),
  setSceneTabTitle: (sceneId, title) =>
    set((state) => ({
      ...state,
      sceneTabs: state.sceneTabs.map((tab) =>
        tab.sceneId === sceneId ? { ...tab, title } : tab,
      ),
    })),
  continuityFilter: "all",
  setContinuityFilter: (continuityFilter) => set({ continuityFilter }),
  canvasAppearance: "light",
  setCanvasAppearance: (canvasAppearance) => set({ canvasAppearance }),
  startScreen: "loading",
  setStartScreen: (startScreen) => set({ startScreen }),
}));
