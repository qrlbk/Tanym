import { create } from "zustand";

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
  currentPage: number;
  setCurrentPage: (page: number) => void;
  lastSaved: Date | null;
  setLastSaved: (date: Date | null) => void;
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
  currentPage: 1,
  setCurrentPage: (currentPage) => set({ currentPage }),
  lastSaved: null,
  setLastSaved: (lastSaved) => set({ lastSaved }),
}));
