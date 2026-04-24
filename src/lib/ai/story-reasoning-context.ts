import type { CausalChain, MotivationAssessment, ConsequenceAssessment } from "@/lib/plot-index/story-extraction";

const MAX_LINES = 10;

export function buildStoryReasoningContext(args: {
  focusedCharacterName?: string | null;
  motivationAssessments: MotivationAssessment[];
  consequenceAssessments: ConsequenceAssessment[];
  causalChains: CausalChain[];
}): string {
  const { focusedCharacterName, motivationAssessments, consequenceAssessments, causalChains } = args;
  const name = focusedCharacterName?.trim().toLowerCase() ?? "";
  const motives = motivationAssessments
    .filter((item) => !name || item.entity.toLowerCase().includes(name))
    .slice(0, MAX_LINES)
    .map(
      (item) =>
        `- motive(${Math.round(item.confidence * 100)}%, ${item.verdict}): ${item.entity} -> ${item.motivation}. reason: ${item.reason}`,
    );
  const chains = causalChains
    .filter((item) => !name || item.involvedEntities.some((entity) => entity.toLowerCase().includes(name)))
    .slice(0, MAX_LINES)
    .map(
      (item) =>
        `- chain(${Math.round(item.confidence * 100)}%): ${item.trigger} -> ${item.decision} -> ${item.action} -> ${item.consequence}`,
    );
  const consequences = consequenceAssessments
    .slice(0, MAX_LINES)
    .map(
      (item) =>
        `- consequence(${Math.round(item.confidence * 100)}%, ${item.verdict}): ${item.event} -> ${item.reason}`,
    );

  return [motives.join("\n"), chains.join("\n"), consequences.join("\n")]
    .filter(Boolean)
    .join("\n");
}
