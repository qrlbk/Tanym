import type { UIMessage } from "ai";

export function getTextFromUserMessage(message: UIMessage): string {
  if (message.role !== "user") return "";
  const textParts = message.parts.filter((p) => p.type === "text");
  return textParts.map((p) => p.text).join("");
}

export function getTextFromAssistantMessage(message: UIMessage): string {
  if (message.role !== "assistant") return "";
  const textParts = message.parts.filter((p) => p.type === "text");
  return textParts.map((p) => p.text).join("");
}
