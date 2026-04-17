/**
 * Константы PlotStory panel. Вынесены из PlotStoryPanel.tsx для снижения объёма
 * основного файла и переиспользования в будущих подпанелях
 * (см. roadmap фаза 4 → `panels/`).
 */

export type PlotStoryTabId =
  | "characters"
  | "cards"
  | "conflicts"
  | "timeline"
  | "resolutions";

export const WARNING_STATUS_LABEL: Record<
  "new" | "acknowledged" | "resolved" | "ignored",
  string
> = {
  new: "новый",
  acknowledged: "в работе",
  resolved: "подтверждён",
  ignored: "игнор",
};

export const WARNING_SOURCE_LABEL: Record<
  "fact_merge" | "rule_pass" | "llm_self_check",
  string
> = {
  fact_merge: "фактовый merge",
  rule_pass: "эвристика",
  llm_self_check: "LLM-проверка",
};
