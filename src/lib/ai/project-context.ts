/**
 * Project context payload: a compact description of the whole StoryProject
 * sent with every AI chat turn so the model can understand scope without
 * needing to call tools first.
 *
 * The payload has sections with declared priorities; the server applies a
 * budget and drops lower-priority sections when the payload is too large.
 */

import type { Editor } from "@tiptap/react";
import type {
  CharacterProfile,
  StoryChapter,
  StoryProject,
  StoryScene,
} from "@/lib/project/types";
import { sceneContentToPlainText } from "@/lib/ai/addressing";

export type ProjectContextScene = {
  sceneId: string;
  /** Canonical scene reference (scene:<uuid>). */
  sceneRef: string;
  title: string;
  order: number;
  chapterId: string;
  chapterTitle: string;
  wordCount: number;
  updatedAt: string;
  summary: string | null;
  isActive: boolean;
};

export type ProjectContextCharacter = {
  id: string;
  ref: string;
  displayName: string;
  role: string | null;
  aliases: string[];
  tags: string[];
};

export type ProjectContextPayload = {
  projectId: string;
  projectTitle: string;
  activeSceneId: string | null;
  sceneCount: number;
  chapterCount: number;
  characterCount: number;
  chapters: Array<{
    id: string;
    title: string;
    order: number;
    scenes: ProjectContextScene[];
  }>;
  characters: ProjectContextCharacter[];
};

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function summariseForProjectContext(scene: StoryScene): string | null {
  if (scene.summary && scene.summary.trim()) return scene.summary.trim();
  const text = sceneContentToPlainText(scene.content);
  if (!text) return null;
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;
  const MAX = 280;
  if (trimmed.length <= MAX) return trimmed;
  return `${trimmed.slice(0, MAX - 1).trimEnd()}…`;
}

function profileToContext(p: CharacterProfile): ProjectContextCharacter {
  return {
    id: p.id,
    ref: `character:${p.id}`,
    displayName: p.displayName,
    role: p.role,
    aliases: p.aliases.slice(0, 6),
    tags: p.tags.slice(0, 8),
  };
}

function chapterToContext(
  chapter: StoryChapter,
  activeSceneId: string | null,
): {
  id: string;
  title: string;
  order: number;
  scenes: ProjectContextScene[];
} {
  return {
    id: chapter.id,
    title: chapter.title,
    order: chapter.order,
    scenes: chapter.scenes.map((scene): ProjectContextScene => {
      const text = sceneContentToPlainText(scene.content);
      return {
        sceneId: scene.id,
        sceneRef: `scene:${scene.id}`,
        title: scene.title,
        order: scene.order,
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        wordCount: countWords(text),
        updatedAt: scene.updatedAt,
        summary: summariseForProjectContext(scene),
        isActive: activeSceneId === scene.id,
      };
    }),
  };
}

export function buildProjectContextPayload(
  project: StoryProject | null,
  activeSceneId: string | null,
): ProjectContextPayload | null {
  if (!project) return null;
  let sceneCount = 0;
  for (const c of project.chapters) sceneCount += c.scenes.length;
  return {
    projectId: project.id,
    projectTitle: project.title,
    activeSceneId,
    sceneCount,
    chapterCount: project.chapters.length,
    characterCount: project.characterProfiles.length,
    chapters: project.chapters.map((c) => chapterToContext(c, activeSceneId)),
    characters: project.characterProfiles.map(profileToContext),
  };
}

/**
 * Render the payload as a plaintext block for the system prompt, respecting
 * an approximate character budget. Sections are emitted in priority order:
 *   1. Header (project title, counts, active scene)
 *   2. Chapter/scene outline (refs + word counts)
 *   3. Character registry
 *   4. Scene synopses (truncated first if over budget)
 */
export function renderProjectContextForSystem(
  payload: ProjectContextPayload,
  budgetChars = 40_000,
): string {
  const sections: string[] = [];
  const activeLine = payload.activeSceneId
    ? `Active scene id: ${payload.activeSceneId} (scene:${payload.activeSceneId})`
    : "No active scene selected.";

  sections.push(
    [
      `## Project context (automatic; current when the message was sent)`,
      ``,
      `Project: **${payload.projectTitle}** (id \`${payload.projectId}\`)`,
      `Chapters: ${payload.chapterCount}; scenes: ${payload.sceneCount}; characters: ${payload.characterCount}.`,
      activeLine,
      ``,
      `Use canonical references to address scenes and blocks:`,
      `- Scene: \`scene:<uuid>\` (preferred) or raw StoryScene.id.`,
      `- Block inside a scene: \`scene:<uuid>#block:<blockId>\`.`,
      `- Character: \`character:<uuid>\`.`,
      `Cross-scene read/edit tools (list_scenes, read_scene, edit_scene, edit_block, …) accept these refs.`,
      ``,
    ].join("\n"),
  );

  const outlineLines: string[] = ["### Outline", ""];
  for (const chapter of payload.chapters) {
    outlineLines.push(
      `- **${chapter.title}** (chapter:${chapter.id}) — ${chapter.scenes.length} scene(s)`,
    );
    for (const scene of chapter.scenes) {
      const active = scene.isActive ? " [ACTIVE]" : "";
      outlineLines.push(
        `  - ${scene.order + 1}. ${scene.title}${active} — \`${scene.sceneRef}\` · ${scene.wordCount} words`,
      );
    }
  }
  outlineLines.push("");
  sections.push(outlineLines.join("\n"));

  if (payload.characters.length > 0) {
    const lines: string[] = ["### Characters", ""];
    for (const c of payload.characters) {
      const parts: string[] = [`- **${c.displayName}** (\`${c.ref}\`)`];
      if (c.role) parts.push(`role: ${c.role}`);
      if (c.aliases.length) parts.push(`aliases: ${c.aliases.join(", ")}`);
      if (c.tags.length) parts.push(`tags: ${c.tags.join(", ")}`);
      lines.push(parts.join(" · "));
    }
    lines.push("");
    sections.push(lines.join("\n"));
  }

  const synopsisLines: string[] = ["### Scene synopses", ""];
  let hasAnySynopsis = false;
  for (const chapter of payload.chapters) {
    for (const scene of chapter.scenes) {
      if (!scene.summary) continue;
      hasAnySynopsis = true;
      synopsisLines.push(
        `- \`${scene.sceneRef}\` (${chapter.title} / ${scene.title}): ${scene.summary}`,
      );
    }
  }
  if (hasAnySynopsis) {
    synopsisLines.push("");
    sections.push(synopsisLines.join("\n"));
  }

  // Fit budget (greedy from the back — synopses drop first, then character registry)
  let combined = sections.join("\n\n---\n\n");
  while (combined.length > budgetChars && sections.length > 2) {
    sections.pop();
    combined = sections.join("\n\n---\n\n");
  }
  if (combined.length > budgetChars) {
    combined = combined.slice(0, budgetChars) + "\n\n[Truncated for size.]";
  }
  return `\n\n${combined}\n`;
}

/**
 * Convenience wrapper for the AIPanel: builds the payload from the stores'
 * current snapshot and sends a structured object to the server. The server
 * is responsible for rendering it into the system prompt.
 */
export function buildProjectContextFromStores(
  project: StoryProject | null,
  activeSceneId: string | null,
  _editor?: Editor | null,
): ProjectContextPayload | null {
  // `_editor` is currently unused but kept so callers can pass the live
  // TipTap editor in the future to pull more precise wordCount/summaries
  // from the working buffer rather than the last-saved JSONContent.
  void _editor;
  return buildProjectContextPayload(project, activeSceneId);
}
