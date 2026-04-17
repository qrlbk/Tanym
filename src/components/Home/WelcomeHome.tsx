"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FilePlus, FolderOpen, Clock, Sparkles } from "lucide-react";
import { useProjectStore } from "@/stores/projectStore";
import { useUIStore } from "@/stores/uiStore";
import { useDocumentStore } from "@/stores/documentStore";
import { createDefaultProject } from "@/lib/project/defaults";
import { clearPersistedDocument } from "@/lib/doc-persistence";
import { resetDocxSaveTarget, setDocxSaveTargetFromOpen } from "@/lib/save-docx-workflow";
import { importDocx } from "@/lib/file-io";
import { isTauri, tauriOpenDialog, tauriReadFile } from "@/lib/tauri-helpers";
import { getRecentFilePaths, addRecentFilePath } from "@/lib/recent-files";
import { useToastStore } from "@/stores/toastStore";
import { UI_COLORS } from "@/lib/theme/colors";

function applyImportedHtmlToActiveScene(html: string) {
  const activeSceneId = useUIStore.getState().activeSceneId;
  const setSceneContent = useProjectStore.getState().setSceneContent;
  if (!activeSceneId) return false;
  setSceneContent(activeSceneId, {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text: html }] }],
  });
  return true;
}

export default function WelcomeHome() {
  const setProject = useProjectStore((s) => s.setProject);
  const setSceneTabs = useUIStore((s) => s.setSceneTabs);
  const setActiveSceneId = useUIStore((s) => s.setActiveSceneId);
  const setStartScreen = useUIStore((s) => s.setStartScreen);
  const pushToast = useToastStore((s) => s.push);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [inTauri, setInTauri] = useState(false);
  const [recentTick, setRecentTick] = useState(0);

  useEffect(() => {
    setInTauri(isTauri());
  }, []);

  const recent = useMemo(() => getRecentFilePaths(), [recentTick, inTauri]);

  const enterEditor = useCallback(() => {
    setStartScreen("editor");
    setRecentTick((t) => t + 1);
  }, [setStartScreen]);

  const handleCreateNew = useCallback(() => {
    resetDocxSaveTarget();
    void clearPersistedDocument();
    const project = createDefaultProject("Документ1");
    setProject(project);
    const first = project.chapters[0]?.scenes[0];
    if (first) {
      setSceneTabs([{ sceneId: first.id, title: first.title }]);
      setActiveSceneId(first.id);
    }
    useDocumentStore.getState().setTitle("Документ1");
    useDocumentStore.getState().setDirty(false);
    useDocumentStore.getState().setSaveError(null);
    enterEditor();
    pushToast("Новый проект готов", "info");
  }, [enterEditor, pushToast, setActiveSceneId, setProject, setSceneTabs]);

  const finishDocxImport = useCallback(
    async (arrayBuffer: ArrayBuffer, sourceLabel: string) => {
      try {
        const { html, warnings } = await importDocx(arrayBuffer);
        if (!applyImportedHtmlToActiveScene(html)) {
          pushToast("Не удалось вставить текст: нет активной сцены", "error");
          return;
        }
        const name =
          sourceLabel.split(/[\\/]/).pop()?.replace(/\.docx?$/i, "") ?? "Документ";
        useDocumentStore.getState().setTitle(name);
        useDocumentStore.getState().setDirty(false);
        useDocumentStore.getState().setSaveError(null);
        if (warnings.length > 0) {
          const short = warnings.slice(0, 4).join("\n");
          pushToast(
            "Файл открыт; часть форматирования могла не перенестись.\n" +
              short +
              (warnings.length > 4 ? `\n…ещё ${warnings.length - 4}` : ""),
            "info",
          );
        } else {
          pushToast("Документ открыт", "info");
        }
        enterEditor();
      } catch (err) {
        pushToast("Ошибка при открытии: " + (err as Error).message, "error");
      }
    },
    [enterEditor, pushToast],
  );

  const openFromPath = useCallback(
    async (filePath: string) => {
      const bytes = await tauriReadFile(filePath);
      if (!bytes) {
        pushToast("Не удалось прочитать файл", "error");
        return;
      }
      const arrayBuffer = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength,
      ) as ArrayBuffer;
      addRecentFilePath(filePath);
      setDocxSaveTargetFromOpen(filePath);
      await finishDocxImport(arrayBuffer, filePath);
    },
    [finishDocxImport, pushToast],
  );

  const handleOpenTauri = useCallback(async () => {
    const filePath = await tauriOpenDialog();
    if (!filePath) return;
    await openFromPath(filePath);
  }, [openFromPath]);

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      try {
        const buf = await file.arrayBuffer();
        await finishDocxImport(buf, file.name);
      } catch (err) {
        pushToast("Ошибка при открытии: " + (err as Error).message, "error");
      }
    },
    [finishDocxImport, pushToast],
  );

  const panel = {
    borderColor: UI_COLORS.shellBorder,
    background: UI_COLORS.shellBgElevated,
    boxShadow: "0 24px 64px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)",
  } as const;

  return (
    <div
      className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto px-4 py-10 font-sans"
      style={{
        fontFamily: "Inter, system-ui, sans-serif",
        background: `radial-gradient(ellipse 80% 60% at 50% -20%, ${UI_COLORS.accentPrimaryBg}33, transparent 55%), ${UI_COLORS.shellBg}`,
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,.doc"
        className="hidden"
        onChange={handleFileInput}
      />

      <div
        className="w-full max-w-[440px] space-y-6 rounded-[16px] border p-8"
        style={panel}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: UI_COLORS.accentPrimaryBg,
              color: UI_COLORS.accentPrimaryText,
            }}
          >
            <Sparkles size={22} strokeWidth={1.75} />
          </div>
          <div>
            <h1
              className="text-[22px] font-semibold tracking-tight"
              style={{ color: UI_COLORS.shellTextStrong }}
            >
              Tanym
            </h1>
            <p className="mt-1 text-[13px] leading-snug" style={{ color: UI_COLORS.shellTextMuted }}>
              Редактор для романов: главы, сцены, AI и DOCX. Выберите действие или недавний файл.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={handleCreateNew}
            className="flex w-full items-center gap-3 rounded-[11px] border px-4 py-3.5 text-left text-[14px] font-medium transition-colors"
            style={{
              borderColor: UI_COLORS.shellBorder,
              color: UI_COLORS.shellText,
              background: UI_COLORS.ribbon.controlHover,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = UI_COLORS.ribbon.panelBg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = UI_COLORS.ribbon.controlHover;
            }}
          >
            <FilePlus size={20} className="shrink-0 opacity-90" />
            <span>Создать новый проект</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (inTauri) void handleOpenTauri();
              else fileInputRef.current?.click();
            }}
            className="flex w-full items-center gap-3 rounded-[11px] border px-4 py-3.5 text-left text-[14px] font-medium transition-colors"
            style={{
              borderColor: UI_COLORS.shellBorder,
              color: UI_COLORS.shellText,
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = UI_COLORS.ribbon.controlHover;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <FolderOpen size={20} className="shrink-0 opacity-90" />
            <span>Открыть .docx…</span>
          </button>
        </div>

        {recent.length > 0 && (
          <>
            <div className="h-px" style={{ background: UI_COLORS.ribbon.separator }} />
            <div>
              <div
                className="mb-2 flex items-center gap-1.5 text-[11px] font-medium tracking-tight"
                style={{ color: UI_COLORS.shellTextMuted }}
              >
                <Clock size={13} className="shrink-0" />
                Недавние файлы
              </div>
              <ul className="max-h-[200px] space-y-0.5 overflow-y-auto [scrollbar-width:thin]">
                {recent.map((path) => (
                  <li key={path}>
                    <button
                      type="button"
                      onClick={() => {
                        if (inTauri) void openFromPath(path);
                      }}
                      disabled={!inTauri}
                      title={inTauri ? path : "Недавние доступны в версии для ПК"}
                      className="w-full truncate rounded-[9px] px-3 py-2 text-left text-[12px] transition-colors disabled:cursor-not-allowed disabled:opacity-45"
                      style={{ color: UI_COLORS.shellText }}
                      onMouseEnter={(e) => {
                        if (inTauri) e.currentTarget.style.background = UI_COLORS.ribbon.controlHover;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      {path.split(/[\\/]/).pop() ?? path}
                    </button>
                  </li>
                ))}
              </ul>
              {!inTauri && (
                <p className="mt-2 text-[11px] leading-snug" style={{ color: UI_COLORS.shellTextMuted }}>
                  Список недавних путей к файлам используется в десктоп-приложении. В браузере откройте файл
                  кнопкой выше.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
