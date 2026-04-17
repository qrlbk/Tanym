import { listEntityNamesMissingCards } from "@/lib/project/character-cards-from-facts";
import { usePlotStoryStore } from "@/stores/plotStoryStore";
import { useProjectStore } from "@/stores/projectStore";
import { useToastStore } from "@/stores/toastStore";

export const CHARACTER_NAME_TOAST_STORAGE_KEY = "tanym-showCharacterNameToasts";
const LEGACY_CHARACTER_NAME_TOAST_KEY = "word-ai-showCharacterNameToasts";

let lastMissingToastAt = 0;
const AUTO_TOAST_COOLDOWN_MS = 120_000;

/** Respect user preference from localStorage (default: show). */
export function shouldShowCharacterNameToasts(): boolean {
  if (typeof window === "undefined") return true;
  const cur = localStorage.getItem(CHARACTER_NAME_TOAST_STORAGE_KEY);
  if (cur !== null) return cur !== "false";
  const legacy = localStorage.getItem(LEGACY_CHARACTER_NAME_TOAST_KEY);
  if (legacy !== null) return legacy !== "false";
  return true;
}

/**
 * If there are plot-fact entity names without a character card, show one info toast
 * (throttled for background auto-extraction).
 */
export function notifyMissingCharacterCardsIfNeeded(options?: { force?: boolean }) {
  if (typeof window === "undefined") return;
  if (!shouldShowCharacterNameToasts()) return;

  const facts = usePlotStoryStore.getState().facts;
  const profiles = useProjectStore.getState().project?.characterProfiles ?? [];
  const missing = listEntityNamesMissingCards(facts, profiles);
  if (missing.length === 0) return;

  const now = Date.now();
  if (!options?.force && now - lastMissingToastAt < AUTO_TOAST_COOLDOWN_MS) {
    return;
  }
  lastMissingToastAt = now;

  useToastStore.getState().push(
    `В фактах есть ${missing.length} имён без карточки — вкладка «Карточки» в Индексе сюжета.`,
    "info",
  );
}
