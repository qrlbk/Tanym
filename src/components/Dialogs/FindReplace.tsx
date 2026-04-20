"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { X, ChevronUp, ChevronDown } from "lucide-react";
import { useUIStore } from "@/stores/uiStore";
import { useEditorContext } from "@/components/Editor/EditorProvider";
import { collectTextMatches } from "@/lib/find-utils";

export default function FindReplaceDialog() {
  const show = useUIStore((s) => s.showFindReplace);
  const setShow = useUIStore((s) => s.setShowFindReplace);
  const setFindSeedText = useUIStore((s) => s.setFindSeedText);
  const editor = useEditorContext();

  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [showReplace, setShowReplace] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  const findInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        setShow(true);
        setShowReplace(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "h") {
        e.preventDefault();
        setShow(true);
        setShowReplace(true);
      }
      if (e.key === "Escape" && show) {
        setShow(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [show, setShow]);

  useEffect(() => {
    if (!show) return;
    const seed = useUIStore.getState().findSeedText;
    if (seed != null && seed !== "") {
      queueMicrotask(() => {
        setFindText(seed);
        setFindSeedText(null);
      });
    }
    requestAnimationFrame(() => {
      findInputRef.current?.focus();
      findInputRef.current?.select();
    });
  }, [show, setFindSeedText]);

  const getPositions = useCallback(() => {
    if (!editor) return [];
    return collectTextMatches(
      editor.state.doc,
      findText,
      matchCase,
      wholeWord,
    );
  }, [editor, findText, matchCase, wholeWord]);

  useEffect(() => {
    if (!editor) return;
    const positions = collectTextMatches(
      editor.state.doc,
      findText,
      matchCase,
      wholeWord,
    );
    queueMicrotask(() => {
      setMatchCount(positions.length);
      setCurrentMatch((c) => {
        if (positions.length === 0) return 0;
        if (c === 0) return 1;
        return Math.min(c, positions.length);
      });
    });
  }, [editor, findText, matchCase, wholeWord]);

  useEffect(() => {
    if (!editor) return;
    if (!show) {
      editor.commands.setSearchHighlight({
        query: "",
        matchCase: false,
        wholeWord: false,
      });
      return;
    }
    editor.commands.setSearchHighlight({
      query: findText,
      matchCase,
      wholeWord,
    });
  }, [editor, show, findText, matchCase, wholeWord]);

  const findNext = useCallback(() => {
    const positions = getPositions();
    if (positions.length === 0 || !editor) return;
    const cursorPos = editor.state.selection.to;
    const nextIdx = positions.findIndex((p) => p.from >= cursorPos);
    const idx = nextIdx === -1 ? 0 : nextIdx;
    const match = positions[idx];
    editor
      .chain()
      .setTextSelection({ from: match.from, to: match.to })
      .scrollIntoView()
      .run();
    setCurrentMatch(idx + 1);
  }, [editor, getPositions]);

  const findPrevious = useCallback(() => {
    const positions = getPositions();
    if (positions.length === 0 || !editor) return;
    const cursorPos = editor.state.selection.from;
    let idx = -1;
    for (let i = positions.length - 1; i >= 0; i--) {
      if (positions[i].to <= cursorPos) {
        idx = i;
        break;
      }
    }
    if (idx === -1) idx = positions.length - 1;
    const match = positions[idx];
    editor
      .chain()
      .setTextSelection({ from: match.from, to: match.to })
      .scrollIntoView()
      .run();
    setCurrentMatch(idx + 1);
  }, [editor, getPositions]);

  const replaceOne = useCallback(() => {
    if (!editor || !findText) return;
    const { from, to } = editor.state.selection;
    const selected = editor.state.doc.textBetween(from, to);
    const cmpA = matchCase ? selected : selected.toLowerCase();
    const cmpB = matchCase ? findText : findText.toLowerCase();
    if (cmpA === cmpB) {
      editor.chain().focus().insertContentAt({ from, to }, replaceText).run();
    }
    findNext();
  }, [editor, findText, replaceText, matchCase, findNext]);

  const replaceAll = useCallback(() => {
    if (!editor || !findText) return;
    const positions = collectTextMatches(
      editor.state.doc,
      findText,
      matchCase,
      wholeWord,
    );
    if (positions.length === 0) return;
    if (
      !window.confirm(
        `Заменить все вхождения (${positions.length})? Это действие нельзя отменить одной кнопкой.`,
      )
    ) {
      return;
    }
    let tr = editor.state.tr;
    for (let i = positions.length - 1; i >= 0; i--) {
      const { from, to } = positions[i];
      tr = tr.insertText(replaceText, from, to);
    }
    editor.view.dispatch(tr);
    const after = collectTextMatches(
      editor.state.doc,
      findText,
      matchCase,
      wholeWord,
    );
    setMatchCount(after.length);
    setCurrentMatch(after.length > 0 ? 1 : 0);
    editor.commands.setSearchHighlight({
      query: findText,
      matchCase,
      wholeWord,
    });
  }, [editor, findText, replaceText, matchCase, wholeWord]);

  if (!show) return null;

  return (
    <div
      className="fixed top-[130px] right-4 bg-white border border-gray-300 rounded-lg shadow-xl z-[100] p-3"
      style={{ width: 340, maxHeight: "calc(100vh - 150px)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[12px] font-medium text-gray-700">
          {showReplace ? "Найти и заменить" : "Найти"}
        </span>
        <button
          type="button"
          onClick={() => setShow(false)}
          className="p-0.5 rounded hover:bg-gray-100"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex items-center gap-1 mb-2">
        <input
          ref={findInputRef}
          value={findText}
          onChange={(e) => setFindText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              if (e.shiftKey) findPrevious();
              else findNext();
            }
          }}
          className="flex-1 h-[26px] px-2 text-[12px] border border-gray-300 rounded outline-none focus:border-blue-400"
          placeholder="Найти..."
        />
        <span className="text-[10px] text-gray-400 min-w-[40px] text-center">
          {matchCount > 0 ? `${currentMatch}/${matchCount}` : "0"}
        </span>
        <button
          type="button"
          onClick={findPrevious}
          className="p-1 rounded hover:bg-gray-100"
          title="Предыдущий (Shift+Enter)"
        >
          <ChevronUp size={14} />
        </button>
        <button
          type="button"
          onClick={findNext}
          className="p-1 rounded hover:bg-gray-100"
          title="Следующий (Enter)"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {showReplace && (
        <div className="flex items-center gap-1 mb-2">
          <input
            value={replaceText}
            onChange={(e) => setReplaceText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) replaceOne();
            }}
            className="flex-1 h-[26px] px-2 text-[12px] border border-gray-300 rounded outline-none focus:border-blue-400"
            placeholder="Заменить на..."
          />
          <button
            type="button"
            onClick={replaceOne}
            className="px-2 h-[26px] text-[11px] border border-gray-300 rounded hover:bg-gray-50"
          >
            Заменить
          </button>
          <button
            type="button"
            onClick={replaceAll}
            className="px-2 h-[26px] text-[11px] border border-gray-300 rounded hover:bg-gray-50"
          >
            Все
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-1 text-[11px] text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={matchCase}
              onChange={(e) => setMatchCase(e.target.checked)}
              className="w-3 h-3"
            />
            С учётом регистра
          </label>
          <label className="flex items-center gap-1 text-[11px] text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={wholeWord}
              onChange={(e) => setWholeWord(e.target.checked)}
              className="w-3 h-3"
            />
            Только целые слова
          </label>
        </div>
        <button
          type="button"
          onClick={() => setShowReplace(!showReplace)}
          className="text-[11px] text-blue-600 hover:underline text-left w-fit"
        >
          {showReplace ? "Скрыть замену" : "Показать замену"}
        </button>
      </div>
    </div>
  );
}
