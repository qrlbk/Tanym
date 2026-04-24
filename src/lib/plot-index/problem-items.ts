import type { PlotChunk } from "./chunks";
import type {
  ChekhovWarning,
  ConsistencyWarning,
  ConsequenceAssessment,
  MotivationAssessment,
  PlotFact,
  SalientObject,
  WarningStatus,
} from "./story-extraction";
import { computeUnresolvedThreads } from "./unresolved-threads";

export type ProblemCategory =
  | "Contradictions"
  | "UnresolvedThreads"
  | "WeakMotivation"
  | "MissingConsequences"
  | "CharacterInconsistency"
  | "TimelineIssues";

export type ProblemItem = {
  id: string;
  category: ProblemCategory;
  title: string;
  explanation: string;
  relatedChunkIds: string[];
  warningKey?: string;
  status?: WarningStatus;
  evidenceQuote?: string;
  reasoningTrace?: string;
};

function weakMotivationFromFacts(facts: PlotFact[]): ProblemItem[] {
  return facts
    .filter(
      (fact) =>
        /motivation|мотив|цель|goal/i.test(fact.attribute) &&
        /(резко|вдруг|suddenly|without reason|без причины)/i.test(fact.value),
    )
    .map((fact) => ({
      id: `weak-motivation-${fact.id}`,
      category: "WeakMotivation" as const,
      title: `${fact.entity}: слабая мотивация`,
      explanation: `Действие "${fact.value}" выглядит резким для атрибута "${fact.attribute}".`,
      relatedChunkIds: fact.chunkIds,
    }));
}

function missingConsequencesFromFacts(facts: PlotFact[]): ProblemItem[] {
  return facts
    .filter((fact) => /убийств|murder|взрыв|catastrophe|предал|betray/i.test(fact.value))
    .filter((fact) => !/последств|consequence|reaction|реакц/i.test(fact.attribute))
    .map((fact) => ({
      id: `missing-cons-${fact.id}`,
      category: "MissingConsequences" as const,
      title: `${fact.entity}: отсутствуют последствия`,
      explanation: `Событие "${fact.value}" отмечено без явной реакции мира.`,
      relatedChunkIds: fact.chunkIds,
    }));
}

function characterInconsistencyFromFacts(facts: PlotFact[]): ProblemItem[] {
  return facts
    .filter((fact) => fact.entityType === "character")
    .filter((fact) => /характер|trait|persona|role/i.test(fact.attribute))
    .filter((fact) => /(не свойственно|out of character|не по логике)/i.test(fact.value))
    .map((fact) => ({
      id: `char-inconsistency-${fact.id}`,
      category: "CharacterInconsistency" as const,
      title: `${fact.entity}: несоответствие характера`,
      explanation: `Поведение персонажа не совпадает с заданными traits/role.`,
      relatedChunkIds: fact.chunkIds,
    }));
}

export function buildProblemItems(args: {
  consistencyWarnings: ConsistencyWarning[];
  chekhovWarnings: ChekhovWarning[];
  salientObjects: SalientObject[];
  facts: PlotFact[];
  chunks: PlotChunk[];
  warningStatuses: Record<string, WarningStatus>;
  motivationAssessments?: MotivationAssessment[];
  consequenceAssessments?: ConsequenceAssessment[];
}): ProblemItem[] {
  const {
    consistencyWarnings,
    chekhovWarnings,
    salientObjects,
    facts,
    chunks,
    warningStatuses,
    motivationAssessments = [],
    consequenceAssessments = [],
  } = args;
  const contradictionItems: ProblemItem[] = consistencyWarnings.map((warning) => ({
    id: `problem-${warning.id}`,
    category: warning.kind === "timeline_conflict" ? "TimelineIssues" : "Contradictions",
    title: warning.message,
    explanation: `Было: "${warning.previousValue}", стало: "${warning.newValue}".`,
    relatedChunkIds: [...warning.previousChunkIds, ...warning.newChunkIds],
    warningKey: warning.key,
    status: warningStatuses[warning.key] ?? "new",
  }));

  const unresolvedFromChekhov: ProblemItem[] = chekhovWarnings.map((warning) => ({
    id: `problem-${warning.id}`,
    category: "UnresolvedThreads",
    title: warning.objectName,
    explanation: warning.message,
    relatedChunkIds: [warning.introducedChunkId, warning.lastMentionChunkId].filter(Boolean) as string[],
  }));

  const unresolvedFromLifecycle = computeUnresolvedThreads({
    chunks,
    salientObjects,
    facts,
  }).map((thread) => ({
    id: `problem-${thread.id}`,
    category: "UnresolvedThreads" as const,
    title: thread.label,
    explanation: thread.message,
    relatedChunkIds: thread.relatedChunkIds,
  }));

  const weakFromAssessments: ProblemItem[] = motivationAssessments
    .filter((item) => item.verdict === "weak")
    .map((item) => ({
      id: `problem-${item.id}`,
      category: "WeakMotivation" as const,
      title: `${item.entity}: слабая мотивация`,
      explanation: item.reason,
      relatedChunkIds: item.chunkIds,
      evidenceQuote: item.evidenceQuote,
      reasoningTrace: `MotivationCheck(${Math.round(item.confidence * 100)}%): ${item.motivation}`,
    }));

  const missingConsequenceFromAssessments: ProblemItem[] = consequenceAssessments
    .filter((item) => item.verdict === "missing")
    .map((item) => ({
      id: `problem-${item.id}`,
      category: "MissingConsequences" as const,
      title: `${item.event}: не хватает последствий`,
      explanation: item.reason,
      relatedChunkIds: item.chunkIds,
      evidenceQuote: item.evidenceQuote,
      reasoningTrace: `ConsequenceCheck(${Math.round(item.confidence * 100)}%): ${item.event}`,
    }));

  return [
    ...contradictionItems,
    ...unresolvedFromChekhov,
    ...unresolvedFromLifecycle,
    ...weakFromAssessments,
    ...missingConsequenceFromAssessments,
    ...weakMotivationFromFacts(facts),
    ...missingConsequencesFromFacts(facts),
    ...characterInconsistencyFromFacts(facts),
  ];
}
