import type { Node as PMNode } from "@tiptap/pm/model";

/** Заголовки в ячейках таблицы (часто после вставки из DOCX) не считаем сценами — иначе сотни пустых «Scene N». */
function isHeadingInsideTable(doc: PMNode, headingBeforePos: number): boolean {
  if (typeof doc.resolve !== "function") return false;
  const inner = Math.min(headingBeforePos + 1, doc.content.size);
  const $pos = doc.resolve(inner);
  for (let d = $pos.depth; d > 0; d--) {
    const name = $pos.node(d).type.name;
    if (name === "table" || name === "tableCell" || name === "tableHeader") {
      return true;
    }
  }
  return false;
}

export type StoryScene = {
  id: string;
  chapterId: string;
  title: string;
  headingLevel: number;
  from: number;
  to: number;
  wordCount: number;
};

export type StoryChapter = {
  id: string;
  title: string;
  from: number;
  to: number;
  wordCount: number;
  scenes: StoryScene[];
};

export type StoryOutline = {
  chapters: StoryChapter[];
};

type HeadingEntry = {
  pos: number;
  level: number;
  text: string;
};

function headingRange(
  headings: HeadingEntry[],
  i: number,
  docSize: number,
): { from: number; to: number } {
  const current = headings[i];
  const next = headings[i + 1];
  const from = current.pos;
  const to = next ? next.pos : docSize;
  return { from, to };
}

function countWords(text: string): number {
  const cleaned = text.trim();
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).length;
}

export function buildStoryOutlineFromDoc(doc: PMNode): StoryOutline {
  const headings: HeadingEntry[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name !== "heading") return;
    if (isHeadingInsideTable(doc, pos)) return;
    headings.push({
      pos,
      level: Number(node.attrs.level ?? 1),
      text: node.textContent.trim(),
    });
  });

  if (headings.length === 0) {
    const text = doc.textBetween(0, doc.content.size, "\n");
    return {
      chapters: [
        {
          id: "chapter-0",
          title: "Chapter 1",
          from: 0,
          to: doc.content.size,
          wordCount: countWords(text),
          scenes: [
            {
              id: "scene-0",
              chapterId: "chapter-0",
              title: "Scene 1",
              headingLevel: 2,
              from: 0,
              to: doc.content.size,
              wordCount: countWords(text),
            },
          ],
        },
      ],
    };
  }

  const chapters: StoryChapter[] = [];
  let chapterSeq = 0;
  let sceneSeq = 0;
  let currentChapter: StoryChapter | null = null;

  for (let i = 0; i < headings.length; i++) {
    const h = headings[i];
    const { from, to } = headingRange(headings, i, doc.content.size);
    const text = doc.textBetween(from, to, "\n");
    const words = countWords(text);

    const isChapter = h.level <= 1 || !currentChapter;
    if (isChapter) {
      const chapterId = `chapter-${chapterSeq++}`;
      currentChapter = {
        id: chapterId,
        title: h.text || `Chapter ${chapterSeq}`,
        from,
        to,
        wordCount: words,
        scenes: [],
      };
      chapters.push(currentChapter);
      continue;
    }

    if (!currentChapter) continue;

    // H2 = отдельная сцена; H3+ (часто после вставки из DOCX) вкладываем в последнюю сцену, чтобы не плодить десятки «сцен».
    if (h.level === 2) {
      const sceneId = `scene-${sceneSeq++}`;
      currentChapter.scenes.push({
        id: sceneId,
        chapterId: currentChapter.id,
        title: h.text || `Scene ${currentChapter.scenes.length + 1}`,
        headingLevel: h.level,
        from,
        to,
        wordCount: words,
      });
      currentChapter.wordCount += words;
      currentChapter.to = Math.max(currentChapter.to, to);
      continue;
    }

    const last = currentChapter.scenes[currentChapter.scenes.length - 1];
    if (last) {
      last.to = Math.max(last.to, to);
      last.wordCount += words;
      currentChapter.wordCount += words;
      currentChapter.to = Math.max(currentChapter.to, to);
    } else {
      const sceneId = `scene-${sceneSeq++}`;
      currentChapter.scenes.push({
        id: sceneId,
        chapterId: currentChapter.id,
        title: h.text || `Scene ${currentChapter.scenes.length + 1}`,
        headingLevel: h.level,
        from,
        to,
        wordCount: words,
      });
      currentChapter.wordCount += words;
      currentChapter.to = Math.max(currentChapter.to, to);
    }
  }

  for (const chapter of chapters) {
    if (chapter.scenes.length === 0) {
      const chapterText = doc.textBetween(chapter.from, chapter.to, "\n");
      chapter.scenes.push({
        id: `scene-fallback-${chapter.id}`,
        chapterId: chapter.id,
        title: `${chapter.title} / Scene`,
        headingLevel: 2,
        from: chapter.from,
        to: chapter.to,
        wordCount: countWords(chapterText),
      });
    }
  }

  return { chapters };
}

export function findSceneByPosition(
  outline: StoryOutline,
  pos: number,
): StoryScene | null {
  for (const chapter of outline.chapters) {
    for (const scene of chapter.scenes) {
      if (pos >= scene.from && pos < scene.to) return scene;
    }
  }
  return null;
}
