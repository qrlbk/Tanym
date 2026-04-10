"use client";

import { useRef, useCallback } from "react";
import {
  FolderOpen,
  Save,
  Download,
  Printer,
  FilePlus,
  X,
} from "lucide-react";
import { useEditorContext } from "@/components/Editor/EditorProvider";
import { useDocumentStore } from "@/stores/documentStore";
import { exportToDocx, importDocx, exportToPdf } from "@/lib/file-io";
import { EMPTY_DOC_JSON, wrapHtmlInDocPage } from "@/lib/migrate-doc-pages";
import { isTauri, tauriOpenDialog, tauriReadFile } from "@/lib/tauri-helpers";
import { clearPersistedDocument, persistDocument } from "@/lib/doc-persistence";

export default function FileMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const editor = useEditorContext();
  const title = useDocumentStore((s) => s.title);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inTauri = isTauri();

  const handleNew = useCallback(() => {
    if (!editor) return;
    if (
      useDocumentStore.getState().isDirty &&
      !window.confirm("Вы уверены? Несохранённые изменения будут потеряны.")
    )
      return;
    void clearPersistedDocument();
    editor.commands.setContent(EMPTY_DOC_JSON);
    useDocumentStore.getState().setTitle("Документ1");
    useDocumentStore.getState().setDirty(false);
    onClose();
  }, [editor, onClose]);

  const handleOpen = useCallback(async () => {
    if (!editor) return;

    if (inTauri) {
      const filePath = await tauriOpenDialog();
      if (!filePath) return;
      const bytes = await tauriReadFile(filePath);
      if (!bytes) return;
      try {
        const arrayBuffer = bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength,
        );
        const { html, warnings } = await importDocx(arrayBuffer as ArrayBuffer);
        editor.commands.setContent(wrapHtmlInDocPage(html));
        const name = filePath.split(/[\\/]/).pop()?.replace(/\.docx?$/i, "") ?? "Документ";
        useDocumentStore.getState().setTitle(name);
        useDocumentStore.getState().setDirty(false);
        if (warnings.length > 0) {
          const short = warnings.slice(0, 4).join("\n");
          alert(
            "Файл открыт, но часть форматирования могла не перенестись полностью.\n\n" +
              short +
              (warnings.length > 4 ? `\n...и еще ${warnings.length - 4}` : ""),
          );
        }
      } catch (err) {
        alert("Ошибка при открытии файла: " + (err as Error).message);
      }
      onClose();
    } else {
      fileInputRef.current?.click();
    }
  }, [editor, inTauri, onClose]);

  const handleFileImport = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor) return;
      try {
        const { html, warnings } = await importDocx(file);
        editor.commands.setContent(wrapHtmlInDocPage(html));
        useDocumentStore
          .getState()
          .setTitle(file.name.replace(/\.docx?$/i, ""));
        useDocumentStore.getState().setDirty(false);
        if (warnings.length > 0) {
          const short = warnings.slice(0, 4).join("\n");
          alert(
            "Файл открыт, но часть форматирования могла не перенестись полностью.\n\n" +
              short +
              (warnings.length > 4 ? `\n...и еще ${warnings.length - 4}` : "")
          );
        }
      } catch (err) {
        alert("Ошибка при открытии файла: " + (err as Error).message);
      }
      e.target.value = "";
      onClose();
    },
    [editor, onClose]
  );

  const handleSave = useCallback(() => {
    if (!editor) return;
    const json = editor.getJSON();
    void persistDocument(json).then((r) => {
      if (r.ok) {
        useDocumentStore.getState().setDirty(false);
        useDocumentStore.getState().setLastSaved(new Date());
      } else {
        alert("Не удалось сохранить документ: " + r.reason);
      }
      onClose();
    });
  }, [editor, onClose]);

  const handleExportDocx = useCallback(async () => {
    if (!editor) return;
    await exportToDocx(editor, title);
    onClose();
  }, [editor, title, onClose]);

  const handlePrint = useCallback(() => {
    exportToPdf();
    onClose();
  }, [onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex"
      onClick={onClose}
    >
      <div
        className="w-[280px] h-full bg-[#2B579A] shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/20">
          <span className="text-white text-[14px] font-semibold">Файл</span>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Menu items */}
        <div className="flex-1 py-2">
          <MenuItem icon={FilePlus} label="Создать" onClick={handleNew} />
          <MenuItem icon={FolderOpen} label="Открыть (.docx)" onClick={handleOpen} />
          <MenuItem icon={Save} label="Сохранить" onClick={handleSave} />
          <MenuItem icon={Download} label="Экспорт в .docx" onClick={handleExportDocx} />
          <div className="h-px bg-white/20 my-2 mx-4" />
          <MenuItem icon={Printer} label="Печать / PDF" onClick={handlePrint} />
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
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 text-white/90 hover:bg-white/10 transition-colors text-[13px]"
    >
      <Icon size={16} />
      {label}
    </button>
  );
}
