"use client";

import { useRef, useCallback, useMemo, useState, useEffect } from "react";
import {
  FolderOpen,
  Save,
  Download,
  Printer,
  FilePlus,
  KeyRound,
  X,
  Clock,
  Copy,
} from "lucide-react";
import { useEditorContext } from "@/components/Editor/EditorProvider";
import { useDocumentStore } from "@/stores/documentStore";
import { exportProjectToDocx, exportToDocx, importDocx, exportToPdf } from "@/lib/file-io";
import { isTauri, tauriOpenDialog, tauriReadFile } from "@/lib/tauri-helpers";
import { clearPersistedDocument } from "@/lib/doc-persistence";
import { saveDocxExplicit, resetDocxSaveTarget, setDocxSaveTargetFromOpen } from "@/lib/save-docx-workflow";
import { useToastStore } from "@/stores/toastStore";
import { getRecentFilePaths, addRecentFilePath } from "@/lib/recent-files";
import { useProjectStore } from "@/stores/projectStore";
import { createDefaultProject } from "@/lib/project/defaults";
import { useUIStore } from "@/stores/uiStore";
import { UI_COLORS } from "@/lib/theme/colors";

export default function FileMenu({
  open,
  onClose,
  onOpenAISettings,
}: {
  open: boolean;
  onClose: () => void;
  onOpenAISettings: () => void;
}) {
  const editor = useEditorContext();
  const title = useDocumentStore((s) => s.title);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inTauri = isTauri();
  const pushToast = useToastStore((s) => s.push);
  const setProject = useProjectStore((s) => s.setProject);
  const project = useProjectStore((s) => s.project);
  const activeSceneId = useUIStore((s) => s.activeSceneId);
  const setSceneContent = useProjectStore((s) => s.setSceneContent);
  const setSceneTabs = useUIStore((s) => s.setSceneTabs);
  const setActiveSceneId = useUIStore((s) => s.setActiveSceneId);

  const [newDocPrompt, setNewDocPrompt] = useState(false);
  const recent = useMemo(
    () => (open && inTauri ? getRecentFilePaths() : []),
    [inTauri, open],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const applyNewDocument = useCallback(() => {
    resetDocxSaveTarget();
    const project = createDefaultProject("Документ1");
    void clearPersistedDocument();
    setProject(project);
    const first = project.chapters[0]?.scenes[0];
    if (first) {
      setSceneTabs([{ sceneId: first.id, title: first.title }]);
      setActiveSceneId(first.id);
    }
    useDocumentStore.getState().setTitle("Документ1");
    useDocumentStore.getState().setDirty(false);
    useDocumentStore.getState().setSaveError(null);
    setNewDocPrompt(false);
    useUIStore.getState().setStartScreen("editor");
    onClose();
  }, [onClose, setActiveSceneId, setProject, setSceneTabs]);

  const handleNew = useCallback(() => {
    if (!useDocumentStore.getState().isDirty) {
      applyNewDocument();
      return;
    }
    setNewDocPrompt(true);
  }, [applyNewDocument]);

  const openFromPath = useCallback(
    async (filePath: string) => {
      const bytes = await tauriReadFile(filePath);
      if (!bytes) {
        pushToast("Не удалось прочитать файл", "error");
        return;
      }
      try {
        const arrayBuffer = bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        );
        const { html, warnings } = await importDocx(arrayBuffer as ArrayBuffer);
        if (editor) {
          editor.commands.setContent(html);
        } else if (activeSceneId) {
          setSceneContent(activeSceneId, {
            type: "doc",
            content: [{ type: "paragraph", content: [{ type: "text", text: html }] }],
          });
        } else {
          pushToast("Нет активной сцены для вставки документа", "error");
          onClose();
          return;
        }
        const name =
          filePath.split(/[\\/]/).pop()?.replace(/\.docx?$/i, "") ?? "Документ";
        useDocumentStore.getState().setTitle(name);
        useDocumentStore.getState().setDirty(false);
        useDocumentStore.getState().setSaveError(null);
        addRecentFilePath(filePath);
        setDocxSaveTargetFromOpen(filePath);
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
        useUIStore.getState().setStartScreen("editor");
      } catch (err) {
        pushToast("Ошибка при открытии: " + (err as Error).message, "error");
      }
      onClose();
    },
    [activeSceneId, editor, onClose, pushToast, setSceneContent],
  );

  const handleOpen = useCallback(async () => {
    if (inTauri) {
      const filePath = await tauriOpenDialog();
      if (!filePath) return;
      await openFromPath(filePath);
    } else {
      fileInputRef.current?.click();
    }
  }, [inTauri, openFromPath]);

  const handleFileImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!editor && !activeSceneId) {
        pushToast("Подождите инициализацию редактора", "error");
        e.target.value = "";
        return;
      }
      try {
        const { html, warnings } = await importDocx(file);
        if (editor) {
          editor.commands.setContent(html);
        } else if (activeSceneId) {
          setSceneContent(activeSceneId, {
            type: "doc",
            content: [{ type: "paragraph", content: [{ type: "text", text: html }] }],
          });
        }
        useDocumentStore
          .getState()
          .setTitle(file.name.replace(/\.docx?$/i, ""));
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
        useUIStore.getState().setStartScreen("editor");
      } catch (err) {
        pushToast("Ошибка при открытии: " + (err as Error).message, "error");
      }
      e.target.value = "";
      onClose();
    },
    [activeSceneId, editor, onClose, pushToast, setSceneContent],
  );

  const runSave = useCallback(
    (saveAs: boolean) => {
      void saveDocxExplicit(editor ?? null, { saveAs }).then((r) => {
        if (r.ok) {
          pushToast(saveAs ? "Сохранено в выбранный файл" : "Документ сохранён", "info");
          onClose();
        } else if (r.cancelled) {
          // остаёмся в меню
        } else {
          pushToast("Не удалось сохранить: " + r.reason, "error");
        }
      });
    },
    [editor, onClose, pushToast],
  );

  const handleSave = useCallback(() => runSave(false), [runSave]);
  const handleSaveAs = useCallback(() => runSave(true), [runSave]);

  const handleExportDocx = useCallback(async () => {
    if (project) {
      await exportProjectToDocx(project, title);
    } else if (editor) {
      await exportToDocx(editor, title);
    } else {
      pushToast("Нет данных для экспорта", "error");
      return;
    }
    pushToast("Экспорт .docx выполнен", "info");
    onClose();
  }, [editor, onClose, project, pushToast, title]);

  const handlePrint = useCallback(() => {
    exportToPdf();
    onClose();
  }, [onClose]);

  if (!open) return null;

  const panel = {
    borderColor: UI_COLORS.shellBorder,
    background: UI_COLORS.shellBgElevated,
    boxShadow: "0 16px 48px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
  } as const;

  return (
    <div
      className="fixed inset-0 z-[10040] flex justify-start bg-black/40 px-2 pt-10 pb-4 font-sans backdrop-blur-[2px]"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex h-[min(520px,calc(100vh-3rem))] w-[min(288px,calc(100vw-1rem))] flex-col overflow-hidden rounded-[14px] border"
        style={panel}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Меню Файл"
      >
        <div
          className="flex shrink-0 items-center justify-between border-b px-3 py-2.5"
          style={{ borderColor: UI_COLORS.shellBorder }}
        >
          <span className="text-[13px] font-semibold" style={{ color: UI_COLORS.shellTextStrong }}>
            Файл
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-[9px] p-1.5 transition-colors"
            style={{ color: UI_COLORS.shellTextMuted }}
            title="Закрыть"
            aria-label="Закрыть меню"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = UI_COLORS.ribbon.controlHover;
              e.currentTarget.style.color = UI_COLORS.shellText;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = UI_COLORS.shellTextMuted;
            }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 py-2 [scrollbar-width:thin]">
          <MenuItem icon={FilePlus} label="Создать" onClick={handleNew} />
          <MenuItem icon={FolderOpen} label="Открыть (.docx)" onClick={handleOpen} />
          <MenuItem icon={Save} label="Сохранить" onClick={handleSave} />
          <MenuItem icon={Copy} label="Сохранить как…" onClick={handleSaveAs} />
          <MenuItem icon={Download} label="Экспорт в .docx" onClick={handleExportDocx} />

          <div className="my-2 h-px" style={{ background: UI_COLORS.ribbon.separator }} />

          <MenuItem icon={Printer} label="Печать / PDF" onClick={handlePrint} />
          <MenuItem
            icon={KeyRound}
            label="Настройки AI-ключей"
            onClick={() => {
              onClose();
              onOpenAISettings();
            }}
          />

          {inTauri && recent.length > 0 && (
            <>
              <div className="my-2 h-px" style={{ background: UI_COLORS.ribbon.separator }} />
              <div
                className="flex items-center gap-1.5 px-2 py-1.5 text-[11px] font-medium tracking-tight"
                style={{ color: UI_COLORS.shellTextMuted }}
              >
                <Clock size={12} className="shrink-0" />
                Недавние открытые файлы
              </div>
              {recent.map((path) => (
                <button
                  key={path}
                  type="button"
                  onClick={() => void openFromPath(path)}
                  className="w-full truncate rounded-[9px] px-2 py-2 text-left text-[11px] transition-colors"
                  style={{ color: UI_COLORS.shellText }}
                  title={path}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = UI_COLORS.ribbon.controlHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {path.split(/[\\/]/).pop() ?? path}
                </button>
              ))}
            </>
          )}
        </div>

        {!inTauri && (
          <input
            ref={fileInputRef}
            type="file"
            accept=".docx,.doc"
            className="hidden"
            onChange={handleFileImport}
          />
        )}

        {newDocPrompt && (
          <div
            className="absolute inset-0 flex items-end justify-center bg-black/50 p-3 sm:items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-full max-w-[280px] space-y-3 rounded-[12px] border p-4 shadow-xl"
              style={{
                borderColor: UI_COLORS.shellBorder,
                background: UI_COLORS.shellBg,
              }}
              role="dialog"
              aria-labelledby="new-doc-title"
            >
              <p id="new-doc-title" className="text-[13px] font-medium" style={{ color: UI_COLORS.shellTextStrong }}>
                Сохранить изменения в «{title}»?
              </p>
              <p className="text-[11px] leading-snug" style={{ color: UI_COLORS.shellTextMuted }}>
                Перед созданием нового документа можно сохранить текущий.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  className="w-full rounded-[9px] py-2.5 text-[12px] text-white"
                  style={{ background: UI_COLORS.accentPrimaryBg }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = UI_COLORS.accentPrimaryHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = UI_COLORS.accentPrimaryBg;
                  }}
                  onClick={() => {
                    if (!editor) return;
                    void saveDocxExplicit(editor ?? null, { saveAs: false }).then((r) => {
                      if (r.ok) {
                        pushToast("Сохранено", "info");
                        applyNewDocument();
                      } else if (!r.cancelled) {
                        pushToast("Не удалось сохранить: " + r.reason, "error");
                      }
                    });
                  }}
                >
                  Сохранить
                </button>
                <button
                  type="button"
                  className="w-full rounded-[9px] border py-2.5 text-[12px] transition-colors"
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
                  onClick={() => applyNewDocument()}
                >
                  Не сохранять
                </button>
                <button
                  type="button"
                  className="w-full rounded-[9px] py-2 text-[12px] transition-colors"
                  style={{ color: UI_COLORS.shellTextMuted }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = UI_COLORS.ribbon.controlHover;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                  onClick={() => setNewDocPrompt(false)}
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[9px] px-2.5 py-2.5 text-left text-[13px] transition-colors"
      style={{ color: UI_COLORS.shellText }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = UI_COLORS.ribbon.controlHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <Icon size={17} style={{ color: UI_COLORS.shellText }} className="shrink-0 opacity-90" />
      <span className="min-w-0">{label}</span>
    </button>
  );
}
