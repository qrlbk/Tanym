import { create } from "zustand";
import type { PageRange } from "@/lib/layout";

interface DocumentState {
  title: string;
  setTitle: (title: string) => void;
  isDirty: boolean;
  setDirty: (dirty: boolean) => void;
  pageCount: number;
  setPageCount: (count: number) => void;
  wordCount: number;
  setWordCount: (count: number) => void;
  charCount: number;
  setCharCount: (count: number) => void;
  charCountNoSpaces: number;
  setCharCountNoSpaces: (count: number) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  pageRanges: PageRange[];
  setPageRanges: (ranges: PageRange[]) => void;
  lastSaved: Date | null;
  setLastSaved: (date: Date | null) => void;
  saveError: string | null;
  setSaveError: (msg: string | null) => void;
  /** Полный путь к текущему .docx в десктопе (Tauri); для «Сохранить» без диалога. */
  activeDocxPath: string | null;
  setActiveDocxPath: (path: string | null) => void;
}

export const useDocumentStore = create<DocumentState>((set) => ({
  title: "Документ1",
  setTitle: (title) => set({ title }),
  isDirty: false,
  setDirty: (isDirty) => set({ isDirty }),
  pageCount: 1,
  setPageCount: (pageCount) => set({ pageCount }),
  wordCount: 0,
  setWordCount: (wordCount) => set({ wordCount }),
  charCount: 0,
  setCharCount: (charCount) => set({ charCount }),
  charCountNoSpaces: 0,
  setCharCountNoSpaces: (charCountNoSpaces) => set({ charCountNoSpaces }),
  currentPage: 1,
  setCurrentPage: (currentPage) => set({ currentPage }),
  pageRanges: [],
  setPageRanges: (pageRanges) => set({ pageRanges }),
  lastSaved: null,
  setLastSaved: (lastSaved) => set({ lastSaved }),
  saveError: null,
  setSaveError: (saveError) => set({ saveError }),
  activeDocxPath: null,
  setActiveDocxPath: (activeDocxPath) => set({ activeDocxPath }),
}));
