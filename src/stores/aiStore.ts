import { create } from "zustand";
import { PROVIDERS, type ProviderId } from "@/lib/ai/providers";

export type AIMode = "chat" | "agent";

const OFFLINE_FLAG_STORAGE_KEY = "tanym.offlineOnly";
const LEGACY_OFFLINE_FLAG_KEY = "wordai.offlineOnly";

function readOfflineFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      localStorage.getItem(OFFLINE_FLAG_STORAGE_KEY) === "true" ||
      localStorage.getItem(LEGACY_OFFLINE_FLAG_KEY) === "true"
    );
  } catch {
    return false;
  }
}

function writeOfflineFlag(v: boolean): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(OFFLINE_FLAG_STORAGE_KEY, v ? "true" : "false");
    localStorage.removeItem(LEGACY_OFFLINE_FLAG_KEY);
  } catch {
    // ignore quota / private mode errors
  }
}

export type AgentPlanStep = {
  id: string;
  action: string;
  rationale: string;
  sceneRef?: string | null;
};

export type AgentPlan = {
  goal: string;
  steps: AgentPlanStep[];
  notes?: string | null;
  createdAt: number;
};

interface AIState {
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;

  providerId: ProviderId;
  setProviderId: (id: ProviderId) => void;

  /** Chat vs agent (plan + approve + execute). */
  mode: AIMode;
  setMode: (mode: AIMode) => void;

  /** Plan proposed by the planner that the user hasn't approved yet. */
  pendingPlan: AgentPlan | null;
  setPendingPlan: (plan: AgentPlan | null) => void;

  pendingConfirmation: {
    sessionId: string;
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
  } | null;
  setPendingConfirmation: (
    c: AIState["pendingConfirmation"],
  ) => void;

  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;

  /** When set, chat API receives character context (card + facts) */
  focusedCharacterId: string | null;
  setFocusedCharacterId: (id: string | null) => void;

  /**
   * Roadmap фаза 6: «Полностью офлайн».
   * Когда true — UI прячет облачных провайдеров (OpenAI/Anthropic/Google)
   * и форсирует локальный Ollama. Эмбеддинги тоже идут через локальный бэкенд
   * (см. EMBEDDINGS_BACKEND=ollama).
   */
  offlineOnly: boolean;
  setOfflineOnly: (v: boolean) => void;
}

export const useAIStore = create<AIState>((set) => ({
  panelOpen: false,
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),

  providerId: "openai-gpt4o-mini",
  setProviderId: (providerId) => set({ providerId }),

  mode: "chat",
  setMode: (mode) => set({ mode }),

  pendingPlan: null,
  setPendingPlan: (pendingPlan) => set({ pendingPlan }),

  pendingConfirmation: null,
  setPendingConfirmation: (pendingConfirmation) => set({ pendingConfirmation }),

  isProcessing: false,
  setIsProcessing: (isProcessing) => set({ isProcessing }),

  focusedCharacterId: null,
  setFocusedCharacterId: (focusedCharacterId) => set({ focusedCharacterId }),

  offlineOnly: readOfflineFlag(),
  setOfflineOnly: (v) =>
    set((s) => {
      writeOfflineFlag(v);
      // Если переключаем в офлайн, а провайдер облачный — переставляем на
      // первый доступный локальный.
      if (v) {
        const current = PROVIDERS.find((p) => p.id === s.providerId);
        if (!current || current.family !== "local-ollama") {
          const firstLocal = PROVIDERS.find((p) => p.family === "local-ollama");
          if (firstLocal) {
            return { offlineOnly: true, providerId: firstLocal.id };
          }
        }
      }
      return { offlineOnly: v };
    }),
}));

/** Явный список провайдеров, доступных при заданном значении `offlineOnly`. */
export function listAvailableProviders(offlineOnly: boolean) {
  if (!offlineOnly) return PROVIDERS;
  return PROVIDERS.filter((p) => p.family === "local-ollama");
}
