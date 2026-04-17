import { createDefaultProject, createEmptyStoryBible } from "./defaults";
import type {
  CharacterProfile,
  LocationProfile,
  LoreEntry,
  PendingCharacterPatch,
  SceneVersion,
  StoryBible,
  StoryChapter,
  StoryProject,
  StoryScene,
  StyleMemory,
  TimelineEvent,
} from "./types";
import { PROJECT_FORMAT_VERSION } from "./types";

function isoString(v: unknown, fallback: string): string {
  return typeof v === "string" ? v : fallback;
}

function stringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function normalizeLocation(raw: unknown): LocationProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.name !== "string") return null;
  const now = new Date().toISOString();
  return {
    id: o.id,
    name: o.name,
    kind: typeof o.kind === "string" ? o.kind : null,
    description: typeof o.description === "string" ? o.description : "",
    rules: typeof o.rules === "string" ? o.rules : "",
    tags: stringArray(o.tags),
    createdAt: isoString(o.createdAt, now),
    updatedAt: isoString(o.updatedAt, now),
  };
}

function normalizeLoreEntry(raw: unknown): LoreEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.title !== "string") return null;
  const now = new Date().toISOString();
  return {
    id: o.id,
    title: o.title,
    category: typeof o.category === "string" ? o.category : "other",
    body: typeof o.body === "string" ? o.body : "",
    tags: stringArray(o.tags),
    createdAt: isoString(o.createdAt, now),
    updatedAt: isoString(o.updatedAt, now),
  };
}

function normalizeTimelineEvent(raw: unknown): TimelineEvent | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.title !== "string") return null;
  const now = new Date().toISOString();
  const importance =
    o.importance === "plot" ||
    o.importance === "background" ||
    o.importance === "foreshadow"
      ? o.importance
      : "plot";
  return {
    id: o.id,
    title: o.title,
    summary: typeof o.summary === "string" ? o.summary : "",
    when: typeof o.when === "string" ? o.when : "",
    sceneId: typeof o.sceneId === "string" ? o.sceneId : null,
    participants: stringArray(o.participants),
    locationIds: stringArray(o.locationIds),
    importance,
    createdAt: isoString(o.createdAt, now),
    updatedAt: isoString(o.updatedAt, now),
  };
}

function normalizeStoryBible(raw: unknown): StoryBible {
  if (!raw || typeof raw !== "object") return createEmptyStoryBible();
  const o = raw as Record<string, unknown>;
  return {
    locations: Array.isArray(o.locations)
      ? o.locations.map(normalizeLocation).filter((x): x is LocationProfile => x !== null)
      : [],
    lore: Array.isArray(o.lore)
      ? o.lore.map(normalizeLoreEntry).filter((x): x is LoreEntry => x !== null)
      : [],
    timeline: Array.isArray(o.timeline)
      ? o.timeline.map(normalizeTimelineEvent).filter((x): x is TimelineEvent => x !== null)
      : [],
  };
}

function normalizeStyleMemory(raw: unknown): StyleMemory | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const now = new Date().toISOString();
  return {
    description: typeof o.description === "string" ? o.description : "",
    examples: stringArray(o.examples),
    rules: stringArray(o.rules),
    avoid: stringArray(o.avoid),
    updatedAt: isoString(o.updatedAt, now),
  };
}

function normalizeSceneVersion(raw: unknown): SceneVersion | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    typeof o.sceneId !== "string" ||
    typeof o.title !== "string" ||
    typeof o.content !== "object" ||
    o.content === null
  ) {
    return null;
  }
  const source = (o.source && typeof o.source === "object" ? o.source : null) as
    | Record<string, unknown>
    | null;
  return {
    id: o.id,
    sceneId: o.sceneId,
    title: o.title,
    content: o.content as SceneVersion["content"],
    createdAt: typeof o.createdAt === "number" ? o.createdAt : Date.now(),
    label: typeof o.label === "string" ? o.label : "Snapshot",
    source: source
      ? {
          kind: source.kind === "manual" ? "manual" : "ai",
          messageId: typeof source.messageId === "string" ? source.messageId : null,
        }
      : undefined,
  };
}

function normalizeCharacterProfile(raw: unknown): CharacterProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.displayName !== "string") return null;
  const now = new Date().toISOString();
  const aliases = Array.isArray(o.aliases)
    ? o.aliases.filter((x): x is string => typeof x === "string")
    : [];
  const tags = Array.isArray(o.tags)
    ? o.tags.filter((x): x is string => typeof x === "string")
    : [];
  const sourceEntityIds = Array.isArray(o.sourceEntityIds)
    ? o.sourceEntityIds.filter((x): x is string => typeof x === "string")
    : [];
  const sections =
    typeof o.sections === "object" && o.sections !== null && !Array.isArray(o.sections)
      ? (o.sections as CharacterProfile["sections"])
      : {};
  return {
    id: o.id,
    displayName: o.displayName,
    aliases,
    role: o.role === null || typeof o.role === "string" ? o.role : null,
    tags,
    sections,
    sourceEntityIds,
    createdAt: typeof o.createdAt === "string" ? o.createdAt : now,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : now,
  };
}

function normalizeScene(raw: unknown): StoryScene | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== "string") return null;
  const summary =
    typeof o.summary === "string" && o.summary.trim().length > 0
      ? (o.summary as string)
      : null;
  const summaryUpdatedAt =
    typeof o.summaryUpdatedAt === "number" ? o.summaryUpdatedAt : null;
  const summaryHash =
    typeof o.summaryHash === "string" && o.summaryHash.length > 0
      ? o.summaryHash
      : null;
  return {
    ...(o as unknown as StoryScene),
    summary,
    summaryUpdatedAt,
    summaryHash,
  };
}

function normalizeChapter(raw: unknown): StoryChapter | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  if (typeof c.id !== "string") return null;
  const scenes = Array.isArray(c.scenes)
    ? (c.scenes
        .map(normalizeScene)
        .filter((x): x is StoryScene => x !== null))
    : [];
  return {
    ...(c as unknown as StoryChapter),
    scenes,
  };
}

/**
 * Normalize JSON loaded from disk / IndexedDB to the current StoryProject shape.
 */
export function migrateProjectToLatest(raw: unknown): StoryProject {
  if (!raw || typeof raw !== "object") return createDefaultProject();
  const p = raw as Partial<StoryProject>;
  if (!Array.isArray(p.chapters)) return createDefaultProject();

  let characterProfiles: CharacterProfile[] = [];
  if (Array.isArray(p.characterProfiles)) {
    characterProfiles = p.characterProfiles
      .map(normalizeCharacterProfile)
      .filter((x): x is CharacterProfile => x !== null);
  }

  const chapters = p.chapters
    .map(normalizeChapter)
    .filter((x): x is StoryChapter => x !== null);

  const pendingCharacterPatches: PendingCharacterPatch[] = Array.isArray(
    (p as { pendingCharacterPatches?: unknown }).pendingCharacterPatches,
  )
    ? ((p as { pendingCharacterPatches?: unknown }).pendingCharacterPatches as unknown[])
        .filter((x): x is PendingCharacterPatch => !!x && typeof x === "object")
        .map((x) => {
          const o = x as Record<string, unknown>;
          return {
            id: typeof o.id === "string" ? o.id : `pending-${Math.random().toString(36).slice(2, 8)}`,
            profileId: typeof o.profileId === "string" ? o.profileId : "",
            sections:
              typeof o.sections === "object" && o.sections
                ? (o.sections as PendingCharacterPatch["sections"])
                : {},
            role: o.role === null || typeof o.role === "string" ? o.role : null,
            confidence: typeof o.confidence === "number" ? Math.max(0, Math.min(1, o.confidence)) : 0.5,
            reasons: Array.isArray(o.reasons)
              ? o.reasons.filter((v): v is string => typeof v === "string")
              : [],
            impact: (o.impact === "important" ? "important" : "normal") as
              PendingCharacterPatch["impact"],
            sourceSceneId:
              o.sourceSceneId === null || typeof o.sourceSceneId === "string"
                ? o.sourceSceneId
                : null,
            createdAt: typeof o.createdAt === "number" ? o.createdAt : Date.now(),
          };
        })
        .filter((x) => x.profileId)
    : [];

  // v5 → v6: новые поля Story Bible, styleMemory, sceneVersions.
  const storyBible = normalizeStoryBible(
    (p as { storyBible?: unknown }).storyBible,
  );
  const styleMemory = normalizeStyleMemory(
    (p as { styleMemory?: unknown }).styleMemory,
  );
  const sceneVersions: SceneVersion[] = Array.isArray(
    (p as { sceneVersions?: unknown }).sceneVersions,
  )
    ? ((p as { sceneVersions?: unknown }).sceneVersions as unknown[])
        .map(normalizeSceneVersion)
        .filter((x): x is SceneVersion => x !== null)
    : [];

  return {
    ...p,
    formatVersion: PROJECT_FORMAT_VERSION,
    characterProfiles,
    pendingCharacterPatches,
    chapters,
    storyBible,
    styleMemory,
    sceneVersions,
  } as StoryProject;
}
