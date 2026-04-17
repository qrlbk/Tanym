import type { StyleMemory } from "@/lib/project/types";

/**
 * Рендер `StyleMemory` в блок для system prompt. Подмешивается в `/api/ai/chat`
 * рядом с `Editor context` и `Character focus`, чтобы модель сохраняла голос
 * автора при генерации.
 *
 * Если памяти нет или она пуста — возвращаем пустую строку.
 */
export function renderStyleMemoryForPrompt(
  memory: StyleMemory | null | undefined,
): string {
  if (!memory) return "";
  const hasContent =
    (memory.description && memory.description.trim()) ||
    memory.examples.length > 0 ||
    memory.rules.length > 0 ||
    memory.avoid.length > 0;
  if (!hasContent) return "";

  const lines: string[] = [];
  lines.push("");
  lines.push("## Style memory (authorial voice)");
  lines.push("");
  lines.push(
    "The writer has pinned a voice. Preserve these traits strictly when generating new text or rewriting scenes. Do NOT flatten or genericise.",
  );
  lines.push("");
  if (memory.description.trim()) {
    lines.push(`**Описание голоса:** ${memory.description.trim()}`);
    lines.push("");
  }
  if (memory.rules.length > 0) {
    lines.push("**Правила:**");
    for (const rule of memory.rules) {
      lines.push(`- ${rule}`);
    }
    lines.push("");
  }
  if (memory.avoid.length > 0) {
    lines.push("**Избегать:**");
    for (const item of memory.avoid) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }
  if (memory.examples.length > 0) {
    lines.push("**Примеры голоса:**");
    for (const ex of memory.examples.slice(0, 5)) {
      lines.push(`> ${ex.replace(/\n+/g, " ")}`);
    }
  }
  return lines.join("\n");
}

export function createEmptyStyleMemory(): StyleMemory {
  return {
    description: "",
    examples: [],
    rules: [],
    avoid: [],
    updatedAt: new Date().toISOString(),
  };
}
