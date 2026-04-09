import { create } from "zustand";
import type { ProviderId } from "@/lib/ai/providers";

interface AIState {
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;

  providerId: ProviderId;
  setProviderId: (id: ProviderId) => void;

  pendingConfirmation: {
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
  } | null;
  setPendingConfirmation: (
    c: AIState["pendingConfirmation"],
  ) => void;

  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
}

export const useAIStore = create<AIState>((set) => ({
  panelOpen: false,
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),

  providerId: "openai-gpt4o-mini",
  setProviderId: (providerId) => set({ providerId }),

  pendingConfirmation: null,
  setPendingConfirmation: (pendingConfirmation) => set({ pendingConfirmation }),

  isProcessing: false,
  setIsProcessing: (isProcessing) => set({ isProcessing }),
}));
