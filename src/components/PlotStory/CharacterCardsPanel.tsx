"use client";

import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import {
  Plus,
  Trash2,
  MessageCircle,
  Download,
  Filter,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronRight,
  Copy,
  Undo2,
} from "lucide-react";
import { useEditorContext } from "@/components/Editor/EditorProvider";
import { useProjectStore } from "@/stores/projectStore";
import { usePlotStoryStore } from "@/stores/plotStoryStore";
import { useUIStore } from "@/stores/uiStore";
import { useAIStore } from "@/stores/aiStore";
import type { CharacterProfile, CharacterSectionKey } from "@/lib/project/types";
import {
  computeCharacterLastPresence,
  factsForCharacter,
  isCharacterLongAbsent,
} from "@/lib/project/character-presence";
import { listEntityNamesMissingCards } from "@/lib/project/character-cards-from-facts";
import { mergeFactsIntoNotes } from "@/lib/ai/character-context";
import {
  buildCharacterExcerptsBlob,
  buildFactsBlobForDraft,
} from "@/lib/ai/character-excerpts";
import { CHARACTER_NAME_TOAST_STORAGE_KEY } from "@/lib/project/character-card-toasts";
import { THEME, UI_COLORS } from "@/lib/theme/colors";
import {
  CARD_SECTION_LABELS as SECTION_LABELS,
  ABSENT_THRESHOLD_SCENES,
  IMPACT_REASON_LABEL,
  characterInitials as initials,
  characterPreviewText as previewText,
} from "./CharacterCards/constants";

export default function CharacterCardsPanel() {
  const project = useProjectStore((s) => s.project);
  const addCharacterProfile = useProjectStore((s) => s.addCharacterProfile);
  const updateCharacterProfile = useProjectStore((s) => s.updateCharacterProfile);
  const deleteCharacterProfile = useProjectStore((s) => s.deleteCharacterProfile);
  const pendingCharacterPatches = useProjectStore(
    (s) => s.project?.pendingCharacterPatches ?? [],
  );
  const applyCharacterPatch = useProjectStore((s) => s.applyCharacterPatch);
  const rejectCharacterPatch = useProjectStore((s) => s.rejectCharacterPatch);

  const facts = usePlotStoryStore((s) => s.facts);
  const motivationAssessments = usePlotStoryStore((s) => s.motivationAssessments);
  const reasoningSignals = usePlotStoryStore((s) => s.reasoningSignals);
  const chunkSceneMap = usePlotStoryStore((s) => s.chunkSceneMap);

  const setRightPanelTab = useUIStore((s) => s.setRightPanelTab);
  const setPanelOpen = useAIStore((s) => s.setPanelOpen);
  const setShowPlotPanel = useUIStore((s) => s.setShowPlotPanel);
  const setFocusedCharacterId = useAIStore((s) => s.setFocusedCharacterId);
  const providerId = useAIStore((s) => s.providerId);
  const editor = useEditorContext();
  const activeSceneId = useUIStore((s) => s.activeSceneId);
  const getSceneById = useProjectStore((s) => s.getSceneById);
  const getChapterBySceneId = useProjectStore((s) => s.getChapterBySceneId);

  const [query, setQuery] = useState("");
  const [absentOnly, setAbsentOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [draftLoading, setDraftLoading] = useState(false);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [draftMode, setDraftMode] = useState<"structure" | "expand">("structure");
  const [showDraftSource, setShowDraftSource] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<{
    sections: Partial<Record<CharacterSectionKey, string>>;
    role: string | null;
    mode: string;
  } | null>(null);
  const [applySection, setApplySection] = useState<Record<CharacterSectionKey, boolean>>(() =>
    Object.fromEntries(
      (Object.keys(SECTION_LABELS) as CharacterSectionKey[]).map((k) => [k, true]),
    ) as Record<CharacterSectionKey, boolean>,
  );
  const [applyRole, setApplyRole] = useState(true);
  const undoSnapshotRef = useRef<{ sections: CharacterProfile["sections"]; role: string | null } | null>(
    null,
  );
  const [canUndo, setCanUndo] = useState(false);
  const [nameToastEnabled, setNameToastEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(CHARACTER_NAME_TOAST_STORAGE_KEY) !== "false";
  });

  const profiles = project?.characterProfiles ?? [];
  const selected = profiles.find((p) => p.id === selectedId) ?? null;
  const selectedPendingPatches = useMemo(
    () =>
      selected
        ? pendingCharacterPatches.filter((p) => p.profileId === selected.id)
        : [],
    [pendingCharacterPatches, selected],
  );

  const presenceById = useMemo(() => {
    if (!project) return new Map<string, ReturnType<typeof computeCharacterLastPresence>>();
    const m = new Map<string, ReturnType<typeof computeCharacterLastPresence>>();
    for (const c of profiles) {
      m.set(
        c.id,
        computeCharacterLastPresence(project, facts, c.displayName, c.aliases, chunkSceneMap),
      );
    }
    return m;
  }, [project, profiles, facts, chunkSceneMap]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return profiles.filter((p) => {
      const hay = [p.displayName, ...p.aliases, ...p.tags].join(" ").toLowerCase();
      if (q && !hay.includes(q)) return false;
      if (absentOnly && project) {
        const pr = presenceById.get(p.id);
        if (!pr || !isCharacterLongAbsent(pr, project, ABSENT_THRESHOLD_SCENES)) {
          return false;
        }
      }
      return true;
    });
  }, [profiles, query, absentOnly, presenceById, project]);

  const suggestions = useMemo(() => {
    if (!project) return [];
    return profiles
      .map((p) => ({
        profile: p,
        presence: presenceById.get(p.id)!,
      }))
      .filter(
        ({ presence }) =>
          presence.linearIndex !== null &&
          isCharacterLongAbsent(presence, project, ABSENT_THRESHOLD_SCENES),
      )
      .slice(0, 6);
  }, [profiles, presenceById, project]);

  const missingFromFacts = useMemo(
    () => listEntityNamesMissingCards(facts, profiles),
    [facts, profiles],
  );

  const relFactsForSelected = useMemo(() => {
    if (!selected) return [];
    return factsForCharacter(facts, selected.displayName, selected.aliases);
  }, [selected, facts]);
  const selectedReasoning = useMemo(() => {
    if (!selected) return { motivations: [], signals: [] };
    const name = selected.displayName.toLowerCase();
    return {
      motivations: motivationAssessments.filter((item) =>
        item.entity.toLowerCase().includes(name),
      ),
      signals: reasoningSignals.filter((item) =>
        item.entity.toLowerCase().includes(name),
      ),
    };
  }, [motivationAssessments, reasoningSignals, selected]);

  const draftSourcePreview = useMemo(() => {
    if (!selected) return null;
    const factsBlob = buildFactsBlobForDraft(relFactsForSelected);
    const ex = editor
      ? buildCharacterExcerptsBlob(editor, relFactsForSelected, {
          activeSceneId,
          getSceneById,
          getChapterBySceneId,
        })
      : { excerptsBlob: "", missingChunkIds: [] as string[], excerptChars: 0 };
    return {
      factsBlob,
      ...ex,
      totalChars: factsBlob.length + ex.excerptsBlob.length,
    };
  }, [
    selected,
    relFactsForSelected,
    editor,
    activeSceneId,
    getSceneById,
    getChapterBySceneId,
  ]);

  useEffect(() => {
    setPendingDraft(null);
    setDraftError(null);
    setCanUndo(false);
    undoSnapshotRef.current = null;
  }, [selectedId]);

  const openDiscussInAI = useCallback(
    (id: string) => {
      setFocusedCharacterId(id);
      setShowPlotPanel(false);
      setPanelOpen(true);
      setRightPanelTab("ai");
    },
    [setFocusedCharacterId, setPanelOpen, setRightPanelTab, setShowPlotPanel],
  );

  const autoPopulateNewCharacter = useCallback(
    async (profileId: string) => {
      const proj = useProjectStore.getState().project;
      const profile = proj?.characterProfiles.find((p) => p.id === profileId);
      if (!profile) return;

      const rel = factsForCharacter(facts, profile.displayName, profile.aliases);
      if (rel.length === 0) return;

      try {
        const factsBlob = buildFactsBlobForDraft(rel);
        const ex = editor
          ? buildCharacterExcerptsBlob(editor, rel, {
              activeSceneId,
              getSceneById,
              getChapterBySceneId,
            })
          : { excerptsBlob: "" };

        const res = await fetch("/api/ai/character-draft", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            providerId,
            displayName: profile.displayName,
            factsBlob,
            excerptsBlob: ex.excerptsBlob,
            mode: "structure",
          }),
        });
        if (!res.ok) return;

        const data = (await res.json()) as {
          sections?: Partial<Record<CharacterSectionKey, string>>;
          role?: string | null;
        };
        const mergedNotes = mergeFactsIntoNotes(profile, rel);
        updateCharacterProfile(profile.id, {
          sections: {
            ...profile.sections,
            ...(data.sections ?? {}),
            notes:
              data.sections?.notes && data.sections.notes.trim()
                ? data.sections.notes
                : mergedNotes,
          },
          role: (data.role ?? profile.role) || profile.role,
        });
      } catch {
        // Silent background autofill; manual draft remains available.
      }
    },
    [
      activeSceneId,
      editor,
      facts,
      getChapterBySceneId,
      getSceneById,
      providerId,
      updateCharacterProfile,
    ],
  );

  const handleAdd = () => {
    const id = addCharacterProfile(newName || "Новый персонаж");
    setNewName("");
    if (id) {
      setSelectedId(id);
      void autoPopulateNewCharacter(id);
    }
  };

  const handleImportFacts = (p: CharacterProfile) => {
    const merged = mergeFactsIntoNotes(p, facts);
    updateCharacterProfile(p.id, {
      sections: { ...p.sections, notes: merged },
    });
  };

  const handleCreateAllMissingFromFacts = useCallback(async () => {
    let lastId: string | null = null;
    const created: string[] = [];
    for (const name of missingFromFacts) {
      const id = addCharacterProfile(name);
      if (id) {
        lastId = id;
        created.push(id);
      }
    }
    for (const id of created) {
      await autoPopulateNewCharacter(id);
    }
    if (lastId) setSelectedId(lastId);
  }, [addCharacterProfile, autoPopulateNewCharacter, missingFromFacts]);

  const handleFillAIDraft = async (p: CharacterProfile) => {
    setDraftError(null);
    setDraftLoading(true);
    try {
      const rel = factsForCharacter(facts, p.displayName, p.aliases);
      const factsBlob = buildFactsBlobForDraft(rel);
      const ex = editor
        ? buildCharacterExcerptsBlob(editor, rel, {
            activeSceneId,
            getSceneById,
            getChapterBySceneId,
          })
        : { excerptsBlob: "" };
      const res = await fetch("/api/ai/character-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId,
          displayName: p.displayName,
          factsBlob,
          excerptsBlob: ex.excerptsBlob,
          mode: draftMode,
        }),
      });
      const data = (await res.json()) as {
        sections?: Partial<Record<CharacterSectionKey, string>>;
        role?: string | null;
        error?: string;
        mode?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "Запрос не удался");
      }
      setPendingDraft({
        sections: data.sections ?? {},
        role: data.role ?? null,
        mode: data.mode ?? draftMode,
      });
      setApplySection(
        Object.fromEntries(
          (Object.keys(SECTION_LABELS) as CharacterSectionKey[]).map((k) => [k, true]),
        ) as Record<CharacterSectionKey, boolean>,
      );
      setApplyRole(true);
    } catch (e) {
      setDraftError(e instanceof Error ? e.message : "Ошибка ИИ");
    } finally {
      setDraftLoading(false);
    }
  };

  const applyPendingDraft = (p: CharacterProfile, all: boolean) => {
    if (!pendingDraft) return;
    undoSnapshotRef.current = { sections: { ...p.sections }, role: p.role };
    const nextSec = { ...p.sections };
    for (const k of Object.keys(SECTION_LABELS) as CharacterSectionKey[]) {
      if (all || applySection[k]) {
        const v = pendingDraft.sections[k];
        if (v !== undefined) nextSec[k] = v;
      }
    }
    const patch: {
      sections: CharacterProfile["sections"];
      role?: string | null;
    } = { sections: nextSec };
    if ((all || applyRole) && pendingDraft.role?.trim()) {
      patch.role = pendingDraft.role.trim();
    }
    updateCharacterProfile(p.id, patch);
    setPendingDraft(null);
    setCanUndo(true);
  };

  const handleUndoLastApply = (p: CharacterProfile) => {
    const snap = undoSnapshotRef.current;
    if (!snap) return;
    updateCharacterProfile(p.id, { sections: snap.sections, role: snap.role });
    undoSnapshotRef.current = null;
    setCanUndo(false);
  };

  const copyDraftSource = () => {
    if (!draftSourcePreview) return;
    const t = [
      "=== Факты ===",
      draftSourcePreview.factsBlob,
      "",
      "=== Отрывки ===",
      draftSourcePreview.excerptsBlob,
    ].join("\n");
    void navigator.clipboard.writeText(t);
  };

  if (!project) return null;

  return (
    <div className="space-y-4">
      <h3
        className="text-[13px] font-semibold tracking-tight"
        style={{ color: UI_COLORS.storyPanel.textPrimary }}
      >
        Карточки персонажей
      </h3>
      <div className="flex items-center justify-between text-[11px]">
        <span style={{ color: UI_COLORS.storyPanel.textMuted }}>
          Автообновление карточек: включено
        </span>
        <span style={{ color: UI_COLORS.storyPanel.textSecondary }}>
          важных изменений ждут: {pendingCharacterPatches.length}
        </span>
      </div>
      <p className="text-[12px] leading-[1.5]" style={{ color: UI_COLORS.storyPanel.textSecondary }}>
        Карточки можно создать вручную, импортировать имена из фактов сюжета (после индексации) или
        сгенерировать поля черновика через ИИ. Для чата про персонажа — «Обсудить в AI».
      </p>

      {missingFromFacts.length > 0 && (
        <div
          className="rounded-md p-3 space-y-2 text-[12px]"
          style={{
            border: `1px solid ${THEME.accent.primaryBorder}`,
            background: THEME.accent.subtleBg,
          }}
        >
          <p className="font-semibold" style={{ color: UI_COLORS.storyPanel.textPrimary }}>
            В фактах есть имена без карточки ({missingFromFacts.length})
          </p>
          <p style={{ color: UI_COLORS.storyPanel.textSecondary }}>
            После «Обновить контекст» и анализа сюжета появятся сущности. Создайте карточки одной
            кнопкой — затем при желании нажмите «Черновик ИИ» в карточке.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {missingFromFacts.slice(0, 12).map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  const id = addCharacterProfile(name);
                  if (id) {
                    setSelectedId(id);
                    void autoPopulateNewCharacter(id);
                  }
                }}
                className="text-[11px] px-2 py-1 rounded border"
                style={{
                  borderColor: THEME.surface.inputBorder,
                  color: UI_COLORS.storyPanel.textPrimary,
                  background: THEME.surface.card,
                }}
              >
                + {name}
              </button>
            ))}
            {missingFromFacts.length > 12 && (
              <span className="text-[11px]" style={{ color: UI_COLORS.storyPanel.textMuted }}>
                …
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleCreateAllMissingFromFacts}
            className="inline-flex items-center gap-2 px-3 py-2 rounded text-[12px] font-medium text-white"
            style={{ background: UI_COLORS.accentPrimaryBg }}
          >
            <Plus size={14} />
            Создать все карточки из списка
          </button>
        </div>
      )}

      {suggestions.length > 0 && (
        <div
          className="rounded-md p-3 space-y-2 text-[12px]"
          style={{
            border: `1px solid ${THEME.surface.inputBorder}`,
            background: THEME.surface.card,
          }}
        >
          <p className="font-semibold" style={{ color: UI_COLORS.storyPanel.textPrimary }}>
            Давно в сюжете не появлялись
          </p>
          <ul className="space-y-1.5" style={{ color: UI_COLORS.storyPanel.textSecondary }}>
            {suggestions.map(({ profile, presence }) => (
              <li key={profile.id}>
                <button
                  type="button"
                  className="text-left w-full underline-offset-2 hover:underline"
                  style={{ color: THEME.accent.primaryBorder }}
                  onClick={() => setSelectedId(profile.id)}
                >
                  {profile.displayName}
                </button>
                {presence.lastSceneTitle ? (
                  <span className="text-[11px]">
                    {" "}
                    — последний раз: «{presence.lastSceneTitle}»
                  </span>
                ) : (
                  <span className="text-[11px]"> — нет привязки к сценам по фактам</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по имени, алиасу, тегу"
            className="flex-1 min-w-[120px] rounded px-2 py-1.5 text-[12px] outline-none"
            style={{
              border: `1px solid ${THEME.surface.inputBorder}`,
              background: THEME.surface.input,
              color: UI_COLORS.storyPanel.textPrimary,
            }}
          />
          <button
            type="button"
            onClick={() => setAbsentOnly((v) => !v)}
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded text-[11px] border"
            style={{
              borderColor: absentOnly ? THEME.accent.primaryBorder : THEME.surface.inputBorder,
              color: UI_COLORS.storyPanel.textPrimary,
              background: absentOnly ? THEME.accent.subtleBg : "transparent",
            }}
            title="Только давно не появлявшиеся (по фактам в памяти)"
          >
            <Filter size={12} />
            Давно не в сюжете
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            placeholder="Имя нового персонажа"
            className="flex-1 min-w-0 rounded px-2 py-1.5 text-[12px] outline-none"
            style={{
              border: `1px solid ${THEME.surface.inputBorder}`,
              background: THEME.surface.input,
              color: UI_COLORS.storyPanel.textPrimary,
            }}
          />
          <button
            type="button"
            onClick={handleAdd}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-[11px] font-medium text-white shrink-0"
            style={{ background: UI_COLORS.accentPrimaryBg }}
          >
            <Plus size={12} />
            Добавить
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {filtered.map((p) => {
          const pr = presenceById.get(p.id);
          const longAbsent =
            project && pr !== undefined && isCharacterLongAbsent(pr, project, ABSENT_THRESHOLD_SCENES);
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setSelectedId(p.id)}
              className="text-left rounded-lg p-3 border transition-colors"
              style={{
                borderColor:
                  selectedId === p.id ? THEME.accent.primaryBorder : THEME.surface.inputBorder,
                background:
                  selectedId === p.id ? THEME.accent.subtleBg : THEME.surface.card,
              }}
            >
              <div className="flex items-start gap-2">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                  style={{
                    background: THEME.surface.elevated,
                    color: UI_COLORS.storyPanel.textPrimary,
                  }}
                >
                  {initials(p.displayName)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 flex-wrap">
                    <span
                      className="font-semibold text-[13px] truncate"
                      style={{ color: UI_COLORS.storyPanel.textPrimary }}
                    >
                      {p.displayName}
                    </span>
                    {longAbsent && (
                      <span
                        className="text-[9px] uppercase px-1 py-0.5 rounded"
                        style={{
                          background: THEME.surface.elevated,
                          color: UI_COLORS.storyPanel.textMuted,
                        }}
                      >
                        давно нет
                      </span>
                    )}
                    {pendingCharacterPatches.some((patch) => patch.profileId === p.id) && (
                      <span
                        className="text-[9px] uppercase px-1 py-0.5 rounded"
                        style={{
                          background: THEME.warning.subtleBg,
                          color: THEME.warning.text,
                        }}
                      >
                        нужно подтверждение
                      </span>
                    )}
                  </div>
                  {p.role && (
                    <p className="text-[11px] truncate" style={{ color: UI_COLORS.storyPanel.textMuted }}>
                      {p.role}
                    </p>
                  )}
                  <p className="text-[11px] line-clamp-2 mt-1" style={{ color: UI_COLORS.storyPanel.textSecondary }}>
                    {previewText(p) || "—"}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <div
          className="rounded-lg border p-3 space-y-3 mt-2"
          style={{
            borderColor: THEME.surface.inputBorder,
            background: THEME.surface.card,
          }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold" style={{ color: UI_COLORS.storyPanel.textPrimary }}>
                {selected.displayName}
              </h4>
              {presenceById.get(selected.id)?.lastSceneTitle && (
                <p className="text-[11px] mt-0.5" style={{ color: UI_COLORS.storyPanel.textMuted }}>
                  Последнее появление (по фактам): «{presenceById.get(selected.id)?.lastSceneTitle}»
                </p>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <button
                type="button"
                onClick={() => openDiscussInAI(selected.id)}
                className="p-1.5 rounded"
                style={{ color: THEME.accent.primaryBorder }}
                title="Обсудить в AI"
              >
                <MessageCircle size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteCharacterProfile(selected.id);
                  setSelectedId(null);
                }}
                className="p-1.5 rounded"
                style={{ color: THEME.danger.text }}
                title="Удалить карточку"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          {selectedPendingPatches.length > 0 && (
            <div
              className="rounded-md border p-2.5 space-y-2"
              style={{
                borderColor: THEME.warning.border,
                background: THEME.warning.subtleBg,
              }}
            >
              <p className="text-[11px] font-semibold" style={{ color: THEME.warning.text }}>
                Важные автоизменения ждут подтверждения ({selectedPendingPatches.length})
              </p>
              {selectedPendingPatches.map((patch) => (
                <div
                  key={patch.id}
                  className="rounded border p-2 space-y-1 text-[11px]"
                  style={{ borderColor: THEME.surface.inputBorder, background: THEME.surface.card }}
                >
                  <p style={{ color: UI_COLORS.storyPanel.textPrimary }}>
                    Причины: {patch.reasons.map((r) => IMPACT_REASON_LABEL[r] ?? r).join(", ")}
                  </p>
                  <p style={{ color: UI_COLORS.storyPanel.textMuted }}>
                    Уверенность: {(patch.confidence * 100).toFixed(0)}% ·{" "}
                    {new Date(patch.createdAt).toLocaleTimeString()}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        applyCharacterPatch(patch.id);
                      }}
                      className="px-2 py-1 rounded text-[11px] text-white"
                      style={{ background: UI_COLORS.accentPrimaryBg }}
                    >
                      Применить
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        rejectCharacterPatch(patch.id);
                      }}
                      className="px-2 py-1 rounded text-[11px] border"
                      style={{ borderColor: THEME.surface.inputBorder, color: UI_COLORS.storyPanel.textSecondary }}
                    >
                      Отклонить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <label className="block text-[11px] space-y-1">
            <span style={{ color: UI_COLORS.storyPanel.textMuted }}>Отображаемое имя</span>
            <input
              type="text"
              value={selected.displayName}
              onChange={(e) =>
                updateCharacterProfile(selected.id, { displayName: e.target.value })
              }
              className="w-full rounded px-2 py-1.5 text-[12px] outline-none"
              style={{
                border: `1px solid ${THEME.surface.inputBorder}`,
                background: THEME.surface.input,
                color: UI_COLORS.storyPanel.textPrimary,
              }}
            />
          </label>

          <label className="block text-[11px] space-y-1">
            <span style={{ color: UI_COLORS.storyPanel.textMuted }}>Роль (протагонист, антагонист…)</span>
            <input
              type="text"
              value={selected.role ?? ""}
              onChange={(e) =>
                updateCharacterProfile(selected.id, { role: e.target.value || null })
              }
              className="w-full rounded px-2 py-1.5 text-[12px] outline-none"
              style={{
                border: `1px solid ${THEME.surface.inputBorder}`,
                background: THEME.surface.input,
                color: UI_COLORS.storyPanel.textPrimary,
              }}
            />
          </label>

          <label className="block text-[11px] space-y-1">
            <span style={{ color: UI_COLORS.storyPanel.textMuted }}>Алиасы (через запятую)</span>
            <input
              type="text"
              value={selected.aliases.join(", ")}
              onChange={(e) =>
                updateCharacterProfile(selected.id, {
                  aliases: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              className="w-full rounded px-2 py-1.5 text-[12px] outline-none"
              style={{
                border: `1px solid ${THEME.surface.inputBorder}`,
                background: THEME.surface.input,
                color: UI_COLORS.storyPanel.textPrimary,
              }}
            />
          </label>

          <label className="block text-[11px] space-y-1">
            <span style={{ color: UI_COLORS.storyPanel.textMuted }}>Теги (через запятую)</span>
            <input
              type="text"
              value={selected.tags.join(", ")}
              onChange={(e) =>
                updateCharacterProfile(selected.id, {
                  tags: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              className="w-full rounded px-2 py-1.5 text-[12px] outline-none"
              style={{
                border: `1px solid ${THEME.surface.inputBorder}`,
                background: THEME.surface.input,
                color: UI_COLORS.storyPanel.textPrimary,
              }}
            />
          </label>

          {(selectedReasoning.motivations.length > 0 || selectedReasoning.signals.length > 0) && (
            <div
              className="rounded-md border p-2.5 space-y-2"
              style={{ borderColor: THEME.surface.inputBorder, background: THEME.surface.elevated }}
            >
              <p className="text-[11px] font-semibold" style={{ color: UI_COLORS.storyPanel.textPrimary }}>
                Reasoning-профиль персонажа
              </p>
              {selectedReasoning.motivations.slice(0, 4).map((item) => (
                <p key={item.id} className="text-[11px]" style={{ color: UI_COLORS.storyPanel.textSecondary }}>
                  Мотив ({item.verdict}, {Math.round(item.confidence * 100)}%): {item.motivation}
                </p>
              ))}
              {selectedReasoning.signals.slice(0, 4).map((item) => (
                <p key={item.id} className="text-[11px]" style={{ color: UI_COLORS.storyPanel.textSecondary }}>
                  {item.type}: {item.summary}
                </p>
              ))}
            </div>
          )}

          <div
            className="rounded-md border p-2.5 space-y-2"
            style={{ borderColor: THEME.surface.inputBorder, background: THEME.surface.elevated }}
          >
            <button
              type="button"
              onClick={() => setShowDraftSource((v) => !v)}
              className="flex items-center gap-1 text-[11px] font-medium w-full text-left"
              style={{ color: UI_COLORS.storyPanel.textPrimary }}
            >
              {showDraftSource ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              Что уйдёт в ИИ ({draftSourcePreview?.totalChars ?? 0} симв.)
            </button>
            {showDraftSource && draftSourcePreview && (
              <div className="space-y-2 text-[10px] font-mono max-h-40 overflow-y-auto leading-snug" style={{ color: UI_COLORS.storyPanel.textSecondary }}>
                <p style={{ color: UI_COLORS.storyPanel.textMuted }}>
                  Фактов: {relFactsForSelected.length}. Отрывков:{" "}
                  {draftSourcePreview.excerptChars > 0
                    ? `~${draftSourcePreview.excerptChars} симв.`
                    : "нет (чанки не совпали с текущим редактором)"}
                  {draftSourcePreview.missingChunkIds.length > 0 &&
                    ` · несопоставимых chunk id: ${draftSourcePreview.missingChunkIds.length}`}
                </p>
                {relFactsForSelected.length === 0 && (
                  <p style={{ color: THEME.danger.text }}>
                    Нет фактов по этому имени — модель будет опираться только на имя и отрывки (если
                    есть).
                  </p>
                )}
                <pre className="whitespace-pre-wrap break-words">{draftSourcePreview.factsBlob || "—"}</pre>
                {draftSourcePreview.excerptsBlob ? (
                  <pre className="whitespace-pre-wrap break-words border-t pt-2" style={{ borderColor: THEME.surface.inputBorder }}>
                    {draftSourcePreview.excerptsBlob}
                  </pre>
                ) : null}
                <button
                  type="button"
                  onClick={copyDraftSource}
                  className="inline-flex items-center gap-1 text-[10px] underline underline-offset-2"
                  style={{ color: THEME.accent.primaryBorder }}
                >
                  <Copy size={10} /> Копировать источник
                </button>
              </div>
            )}
            <div className="flex gap-2 flex-wrap text-[11px]">
              <span style={{ color: UI_COLORS.storyPanel.textMuted }}>Режим:</span>
              <button
                type="button"
                onClick={() => setDraftMode("structure")}
                className="px-2 py-0.5 rounded border"
                style={{
                  borderColor:
                    draftMode === "structure" ? THEME.accent.primaryBorder : THEME.surface.inputBorder,
                  background: draftMode === "structure" ? THEME.accent.subtleBg : "transparent",
                  color: UI_COLORS.storyPanel.textPrimary,
                }}
              >
                Только из фактов
              </button>
              <button
                type="button"
                onClick={() => setDraftMode("expand")}
                className="px-2 py-0.5 rounded border"
                style={{
                  borderColor:
                    draftMode === "expand" ? THEME.accent.primaryBorder : THEME.surface.inputBorder,
                  background: draftMode === "expand" ? THEME.accent.subtleBg : "transparent",
                  color: UI_COLORS.storyPanel.textPrimary,
                }}
              >
                С гипотезами
              </button>
            </div>
            {draftError && (
              <p className="text-[11px]" style={{ color: THEME.danger.text }}>
                {draftError}
              </p>
            )}
            <button
              type="button"
              disabled={draftLoading}
              onClick={() => void handleFillAIDraft(selected)}
              className="inline-flex items-center justify-center gap-2 w-full px-3 py-2 rounded text-[12px] font-medium text-white disabled:opacity-50"
              style={{ background: UI_COLORS.accentPrimaryBg }}
            >
              {draftLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              Запросить черновик ИИ
            </button>
            {pendingDraft && (
              <div className="space-y-2 border-t pt-2" style={{ borderColor: THEME.surface.inputBorder }}>
                <p className="text-[11px] font-semibold" style={{ color: UI_COLORS.storyPanel.textPrimary }}>
                  Предпросмотр (режим: {pendingDraft.mode})
                </p>
                <label className="flex items-center gap-2 text-[11px] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={applyRole}
                    onChange={(e) => setApplyRole(e.target.checked)}
                  />
                  <span style={{ color: UI_COLORS.storyPanel.textSecondary }}>
                    Роль: {pendingDraft.role?.trim() || "—"}
                  </span>
                </label>
                {(Object.keys(SECTION_LABELS) as CharacterSectionKey[]).map((key) => {
                  const next = pendingDraft.sections[key] ?? "";
                  const prev = selected.sections[key] ?? "";
                  return (
                    <label key={key} className="flex gap-2 items-start text-[11px]">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={applySection[key]}
                        onChange={(e) =>
                          setApplySection((s) => ({ ...s, [key]: e.target.checked }))
                        }
                      />
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <span style={{ color: UI_COLORS.storyPanel.textMuted }}>{SECTION_LABELS[key]}</span>
                        <div className="grid grid-cols-1 gap-1">
                          <p className="opacity-70 line-clamp-2">{prev || "—"}</p>
                          <p style={{ color: THEME.accent.primaryBorder }} className="line-clamp-4">
                            → {next || "—"}
                          </p>
                        </div>
                      </div>
                    </label>
                  );
                })}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyPendingDraft(selected, true)}
                    className="px-2.5 py-1.5 rounded text-[11px] text-white"
                    style={{ background: UI_COLORS.accentPrimaryBg }}
                  >
                    Применить всё
                  </button>
                  <button
                    type="button"
                    onClick={() => applyPendingDraft(selected, false)}
                    className="px-2.5 py-1.5 rounded text-[11px] border"
                    style={{
                      borderColor: THEME.accent.primaryBorder,
                      color: THEME.accent.primaryBorder,
                    }}
                  >
                    Применить выбранное
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingDraft(null)}
                    className="px-2.5 py-1.5 rounded text-[11px]"
                    style={{ color: UI_COLORS.storyPanel.textMuted }}
                  >
                    Отменить черновик
                  </button>
                </div>
              </div>
            )}
          </div>

          {(Object.keys(SECTION_LABELS) as CharacterSectionKey[]).map((key) => (
            <label key={key} className="block text-[11px] space-y-1">
              <span style={{ color: UI_COLORS.storyPanel.textMuted }}>{SECTION_LABELS[key]}</span>
              <textarea
                value={selected.sections[key] ?? ""}
                onChange={(e) =>
                  updateCharacterProfile(selected.id, {
                    sections: { ...selected.sections, [key]: e.target.value },
                  })
                }
                rows={key === "notes" ? 5 : 3}
                className="w-full rounded px-2 py-1.5 text-[12px] outline-none resize-y font-mono"
                style={{
                  border: `1px solid ${THEME.surface.inputBorder}`,
                  background: THEME.surface.input,
                  color: UI_COLORS.storyPanel.textPrimary,
                }}
              />
            </label>
          ))}

          {canUndo && (
            <button
              type="button"
              onClick={() => handleUndoLastApply(selected)}
              className="inline-flex items-center gap-2 text-[11px]"
              style={{ color: UI_COLORS.storyPanel.textMuted }}
            >
              <Undo2 size={12} /> Откатить последнее применение черновика
            </button>
          )}

          <button
            type="button"
            onClick={() => handleImportFacts(selected)}
            className="inline-flex items-center gap-2 w-full justify-center px-3 py-2 rounded text-[12px] border"
            style={{
              borderColor: THEME.accent.primaryBorder,
              color: THEME.accent.primaryBorder,
            }}
          >
            <Download size={14} />
            Подтянуть факты из памяти сюжета в заметки
          </button>

          <label className="flex items-center gap-2 text-[11px] cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={nameToastEnabled}
              onChange={(e) => {
                const v = e.target.checked;
                setNameToastEnabled(v);
                localStorage.setItem(CHARACTER_NAME_TOAST_STORAGE_KEY, v ? "true" : "false");
              }}
            />
            <span style={{ color: UI_COLORS.storyPanel.textMuted }}>
              Напоминать, если в фактах есть имена без карточки
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
