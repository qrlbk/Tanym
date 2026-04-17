type LayoutChangeKind = "soft" | "hard";

let layoutVersion = 1;
let contextVersion = 1;
let pendingSoft = false;
const listeners = new Set<(kind: LayoutChangeKind, version: number) => void>();

function emit(kind: LayoutChangeKind): void {
  for (const listener of listeners) {
    listener(kind, layoutVersion);
  }
}

export function getLayoutVersion(): number {
  return layoutVersion;
}

export function getContextVersion(): number {
  return contextVersion;
}

export function bumpContextVersion(): number {
  contextVersion += 1;
  return contextVersion;
}

export function bumpLayoutVersionHard(): number {
  layoutVersion += 1;
  pendingSoft = false;
  emit("hard");
  return layoutVersion;
}

export function scheduleSoftLayoutVersionBump(): void {
  if (pendingSoft) return;
  pendingSoft = true;
  queueMicrotask(() => {
    if (!pendingSoft) return;
    pendingSoft = false;
    layoutVersion += 1;
    emit("soft");
  });
}

export function subscribeLayoutVersion(
  listener: (kind: LayoutChangeKind, version: number) => void,
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

