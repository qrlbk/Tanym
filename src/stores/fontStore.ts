import { create } from "zustand";
import { isTauri } from "@/lib/tauri-helpers";
import { FONT_FAMILIES } from "@/lib/constants";

interface FontState {
  fonts: string[];
  loaded: boolean;
  loadSystemFonts: () => Promise<void>;
}

export const useFontStore = create<FontState>((set, get) => ({
  fonts: FONT_FAMILIES,
  loaded: false,
  loadSystemFonts: async () => {
    if (get().loaded) return;
    if (!isTauri()) {
      set({ loaded: true });
      return;
    }
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const systemFonts = await invoke<string[]>("get_system_fonts");
      if (systemFonts.length > 0) {
        set({ fonts: systemFonts, loaded: true });
      } else {
        set({ loaded: true });
      }
    } catch {
      set({ loaded: true });
    }
  },
}));
