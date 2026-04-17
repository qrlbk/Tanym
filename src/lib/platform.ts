"use client";

const MAC_UA_RE = /Mac|iPhone|iPad|iPod/i;

export function isMacPlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  return MAC_UA_RE.test(navigator.platform || navigator.userAgent);
}

export function getPrimaryModifierLabel(): string {
  return isMacPlatform() ? "⌘" : "Ctrl";
}

export function getAltModifierLabel(): string {
  return isMacPlatform() ? "⌥" : "Alt";
}

export function getShiftModifierLabel(): string {
  return isMacPlatform() ? "⇧" : "Shift";
}

export function formatShortcut(parts: string[]): string {
  return parts.filter(Boolean).join("+");
}
