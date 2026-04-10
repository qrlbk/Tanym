import { create } from "zustand";

export type RibbonTab = "home" | "insert" | "design" | "layout" | "references" | "mailings" | "review" | "view";

interface Margins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export type ViewMode = "edit" | "preview";

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
  previewData: ArrayBuffer | null;
  setPreviewData: (data: ArrayBuffer | null) => void;
  /** Пунктир границы области набора внутри полей (как «границы текста» в Word). */
  showTextBoundaries: boolean;
  setShowTextBoundaries: (show: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeTab: "home",
  setActiveTab: (activeTab) => set({ activeTab }),
  zoom: 100,
  setZoom: (zoom) => set({ zoom: Math.min(200, Math.max(50, zoom)) }),
  showRuler: true,
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
  previewData: null,
  setPreviewData: (previewData) => set({ previewData }),
  /** Как в Word по умолчанию — без пунктира вокруг области набора. */
  showTextBoundaries: false,
  setShowTextBoundaries: (showTextBoundaries) => set({ showTextBoundaries }),
}));
