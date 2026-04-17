export function isTauri(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
}

export async function tauriSaveDialog(
  defaultName: string
): Promise<string | null> {
  if (!isTauri()) return null;
  try {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const path = await save({
      defaultPath: defaultName,
      filters: [{ name: "Документы DOCX", extensions: ["docx"] }],
    });
    return path;
  } catch {
    return null;
  }
}

export async function tauriOpenDialog(): Promise<string | null> {
  if (!isTauri()) return null;
  try {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const path = await open({
      filters: [{ name: "Документы DOCX", extensions: ["docx", "doc"] }],
      multiple: false,
    });
    return path as string | null;
  } catch {
    return null;
  }
}

export async function tauriReadFile(
  path: string
): Promise<Uint8Array | null> {
  if (!isTauri()) return null;
  try {
    const { readFile } = await import("@tauri-apps/plugin-fs");
    return await readFile(path);
  } catch {
    return null;
  }
}

export async function tauriWriteFile(
  path: string,
  data: Uint8Array
): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    await writeFile(path, data);
    return true;
  } catch {
    return false;
  }
}
