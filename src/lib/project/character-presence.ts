import type { PlotFact } from "@/lib/plot-index/story-extraction";
import type { StoryProject } from "./types";

export type SceneOrderIndex = {
  sceneId: string;
  chapterOrder: number;
  sceneOrderInChapter: number;
  /** Monotonic index in reading order across the whole project */
  linearIndex: number;
};

/** Build linear scene order for presence / "long absent" heuristics */
export function buildSceneOrderIndex(project: StoryProject): SceneOrderIndex[] {
  const out: SceneOrderIndex[] = [];
  let linear = 0;
  const chapters = [...project.chapters].sort((a, b) => a.order - b.order);
  for (const ch of chapters) {
    const scenes = [...ch.scenes].sort((a, b) => a.order - b.order);
    let si = 0;
    for (const sc of scenes) {
      out.push({
        sceneId: sc.id,
        chapterOrder: ch.order,
        sceneOrderInChapter: si,
        linearIndex: linear,
      });
      si += 1;
      linear += 1;
    }
  }
  return out;
}

function normalizeEntityName(s: string): string {
  return s.trim().toLowerCase();
}

/** Facts whose entity matches display name or any alias */
export function factsForCharacter(
  facts: PlotFact[],
  displayName: string,
  aliases: string[],
): PlotFact[] {
  const names = new Set(
    [displayName, ...aliases].map(normalizeEntityName).filter(Boolean),
  );
  return facts.filter((f) => names.has(normalizeEntityName(f.entity)));
}

export type CharacterLastPresence = {
  lastChunkId: string | null;
  lastSceneId: string | null;
  lastSceneTitle: string | null;
  lastChapterTitle: string | null;
  linearIndex: number | null;
};

/**
 * Latest mention of a character by chunk → scene map and facts.
 */
export function computeCharacterLastPresence(
  project: StoryProject,
  facts: PlotFact[],
  displayName: string,
  aliases: string[],
  chunkSceneMap: Record<
    string,
    { chapterId: string | null; chapterTitle: string | null; sceneId: string | null; sceneTitle: string | null }
  >,
): CharacterLastPresence {
  const relevant = factsForCharacter(facts, displayName, aliases);
  const order = buildSceneOrderIndex(project);
  const sceneLinear = new Map(order.map((o) => [o.sceneId, o.linearIndex]));

  let bestLinear = -1;
  let bestChunk: string | null = null;
  let bestSceneId: string | null = null;

  for (const f of relevant) {
    for (const cid of f.chunkIds) {
      const mapped = chunkSceneMap[cid];
      const sid = mapped?.sceneId ?? null;
      if (!sid) continue;
      const li = sceneLinear.get(sid);
      if (li === undefined) continue;
      if (li > bestLinear) {
        bestLinear = li;
        bestChunk = cid;
        bestSceneId = sid;
      }
    }
  }

  if (bestLinear < 0 || !bestSceneId) {
    return {
      lastChunkId: bestChunk,
      lastSceneId: null,
      lastSceneTitle: null,
      lastChapterTitle: null,
      linearIndex: null,
    };
  }

  const mapped = bestChunk ? chunkSceneMap[bestChunk] : undefined;
  return {
    lastChunkId: bestChunk,
    lastSceneId: bestSceneId,
    lastSceneTitle: mapped?.sceneTitle ?? null,
    lastChapterTitle: mapped?.chapterTitle ?? null,
    linearIndex: bestLinear,
  };
}

/** True if character was last seen at least `minScenesBehind` scenes before the story end */
export function isCharacterLongAbsent(
  presence: CharacterLastPresence,
  project: StoryProject,
  minScenesBehind: number,
): boolean {
  const order = buildSceneOrderIndex(project);
  if (order.length === 0) return false;
  const lastStory = order[order.length - 1]?.linearIndex ?? 0;
  if (presence.linearIndex === null) return false;
  return lastStory - presence.linearIndex >= minScenesBehind;
}
