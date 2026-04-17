import type { PlotFact } from "@/lib/plot-index/story-extraction";

export type LifecycleClass = "ephemeral" | "recurring" | "long_term";

export type LifecycleEntity = {
  key: string;
  name: string;
  entityType: Exclude<PlotFact["entityType"], "character">;
  narrativeRole: PlotFact["narrativeRole"];
  sceneCount: number;
  mentionCount: number;
  confidence: number;
  lifecycle: LifecycleClass;
};

export type LifecycleBuckets = Record<LifecycleClass, LifecycleEntity[]>;

type ChunkSceneMap = Record<
  string,
  {
    chapterId: string | null;
    chapterTitle: string | null;
    sceneId: string | null;
    sceneTitle: string | null;
  }
>;

function pickLifecycle(
  sceneCount: number,
  role: PlotFact["narrativeRole"],
): LifecycleClass {
  if (
    sceneCount >= 3 ||
    role === "clue" ||
    role === "mcguffin" ||
    role === "evidence"
  ) {
    return "long_term";
  }
  if (sceneCount >= 2) return "recurring";
  return "ephemeral";
}

export function classifyEntityLifecycle(
  facts: PlotFact[],
  chunkSceneMap: ChunkSceneMap,
): LifecycleBuckets {
  const objectFacts = facts.filter(
    (fact) =>
      fact.entityType !== "character" &&
      fact.entityType !== "other",
  );
  const grouped = new Map<string, LifecycleEntity>();

  for (const fact of objectFacts) {
    const key = fact.entity.trim().toLowerCase();
    if (!key) continue;
    const seenScenes = new Set<string>();
    for (const chunkId of fact.chunkIds) {
      const sceneId = chunkSceneMap[chunkId]?.sceneId;
      if (sceneId) seenScenes.add(sceneId);
    }
    const prev = grouped.get(key);
    if (!prev) {
      grouped.set(key, {
        key,
        name: fact.entity,
        entityType: fact.entityType as Exclude<PlotFact["entityType"], "character">,
        narrativeRole: fact.narrativeRole,
        sceneCount: seenScenes.size,
        mentionCount: fact.chunkIds.length,
        confidence: fact.entityConfidence,
        lifecycle: pickLifecycle(seenScenes.size, fact.narrativeRole),
      });
      continue;
    }
    const sceneCount = Math.max(prev.sceneCount, seenScenes.size);
    const confidence = Math.max(prev.confidence, fact.entityConfidence);
    const narrativeRole = prev.narrativeRole ?? fact.narrativeRole;
    const entityType =
      prev.entityType === "other" ? fact.entityType : prev.entityType;
    grouped.set(key, {
      ...prev,
      entityType: entityType as Exclude<PlotFact["entityType"], "character">,
      narrativeRole,
      sceneCount,
      mentionCount: prev.mentionCount + fact.chunkIds.length,
      confidence,
      lifecycle: pickLifecycle(sceneCount, narrativeRole),
    });
  }

  const buckets: LifecycleBuckets = {
    ephemeral: [],
    recurring: [],
    long_term: [],
  };
  for (const entry of grouped.values()) {
    buckets[entry.lifecycle].push(entry);
  }
  for (const bucket of Object.values(buckets)) {
    bucket.sort((a, b) => b.sceneCount - a.sceneCount || b.mentionCount - a.mentionCount);
  }
  return buckets;
}
