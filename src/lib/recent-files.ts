const STORAGE_KEY = "tanym-recent-docx";
const LEGACY_STORAGE_KEY = "word-kz-recent-files";
const MAX_FILES = 10;

function parsePathList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((p): p is string => typeof p === "string");
  } catch {
    return [];
  }
}

export function getRecentFilePaths(): string[] {
  if (typeof window === "undefined") return [];
  const primary = parsePathList(localStorage.getItem(STORAGE_KEY));
  if (primary.length > 0) return primary.slice(0, MAX_FILES);
  return parsePathList(localStorage.getItem(LEGACY_STORAGE_KEY)).slice(0, MAX_FILES);
}

export function clearRecentFilePaths(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore quota */
  }
}

export function addRecentFilePath(path: string): void {
  if (typeof window === "undefined" || !path.trim()) return;
  let list = parsePathList(localStorage.getItem(STORAGE_KEY));
  if (list.length === 0) {
    list = parsePathList(localStorage.getItem(LEGACY_STORAGE_KEY));
  }
  const next = [path, ...list.filter((p) => p !== path)].slice(0, MAX_FILES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore quota */
  }
}
