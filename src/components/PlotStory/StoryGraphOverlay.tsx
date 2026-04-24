"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import type { StoryGraph } from "@/lib/plot-index/story-graph";
import { THEME } from "@/lib/theme/colors";

type NodePoint = {
  id: string;
  x: number;
  y: number;
  label: string;
  kind: string;
  chunkIds: string[];
};

export default function StoryGraphOverlay({
  open,
  graph,
  onClose,
  onJumpToChunk,
  onOpenConflicts,
}: {
  open: boolean;
  graph: StoryGraph;
  onClose: () => void;
  onJumpToChunk: (chunkId: string) => void;
  onOpenConflicts: () => void;
}) {
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);

  const width = 1200;
  const height = 760;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.34;
  const points = useMemo<NodePoint[]>(() => {
    if (graph.nodes.length === 0) return [];
    return graph.nodes.map((node, idx) => {
      const angle = (Math.PI * 2 * idx) / graph.nodes.length;
      return {
        id: node.id,
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
        label: node.label,
        kind: node.kind,
        chunkIds: node.chunkIds,
      };
    });
  }, [graph.nodes, cx, cy, radius]);

  const pointById = useMemo(
    () => new Map(points.map((point) => [point.id, point])),
    [points],
  );

  const linkedNodeIds = useMemo(() => {
    if (!activeNodeId) return new Set<string>();
    const set = new Set<string>([activeNodeId]);
    for (const edge of graph.edges) {
      if (edge.fromNodeId === activeNodeId) set.add(edge.toNodeId);
      if (edge.toNodeId === activeNodeId) set.add(edge.fromNodeId);
    }
    return set;
  }, [activeNodeId, graph.edges]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[220] bg-black/75 backdrop-blur-[1px]">
      <div className="h-full w-full px-6 py-5">
        <div
          className="h-full w-full rounded-xl border flex flex-col overflow-hidden"
          style={{
            borderColor: THEME.surface.inputBorder,
            background: "#0f1220",
          }}
        >
          <div
            className="px-4 py-3 border-b flex items-center justify-between"
            style={{ borderColor: THEME.surface.inputBorder }}
          >
            <div>
              <p className="text-sm font-semibold text-white">Story Graph</p>
              <p className="text-xs text-slate-300">
                Большое древо связей · узлы: {graph.nodes.length} · связи: {graph.edges.length}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border text-slate-200"
              style={{ borderColor: THEME.surface.inputBorder }}
            >
              <X size={14} />
              Закрыть граф
            </button>
          </div>
          <div className="flex-1 min-h-0 grid grid-cols-[1fr_300px]">
            <div className="min-h-0 overflow-auto">
              <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-full min-h-[540px]"
                role="img"
                aria-label="Story Graph visual tree"
              >
                {graph.edges.map((edge) => {
                  const from = pointById.get(edge.fromNodeId);
                  const to = pointById.get(edge.toNodeId);
                  if (!from || !to) return null;
                  const highlighted =
                    activeNodeId != null &&
                    (edge.fromNodeId === activeNodeId || edge.toNodeId === activeNodeId);
                  return (
                    <g key={edge.id}>
                      <line
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke={highlighted ? "#a78bfa" : "#475569"}
                        strokeWidth={highlighted ? 2.2 : 1.2}
                        opacity={highlighted ? 1 : 0.72}
                      />
                      <text
                        x={(from.x + to.x) / 2}
                        y={(from.y + to.y) / 2}
                        fill="#94a3b8"
                        fontSize="10"
                        textAnchor="middle"
                      >
                        {edge.kind}
                      </text>
                    </g>
                  );
                })}
                {points.map((point) => {
                  const focused = activeNodeId === point.id;
                  const dimmed = activeNodeId != null && !linkedNodeIds.has(point.id);
                  return (
                    <g
                      key={point.id}
                      onClick={() => setActiveNodeId(point.id)}
                      style={{ cursor: "pointer" }}
                      opacity={dimmed ? 0.34 : 1}
                    >
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={focused ? 22 : 18}
                        fill={focused ? "#8b5cf6" : "#334155"}
                        stroke={focused ? "#c4b5fd" : "#64748b"}
                        strokeWidth={focused ? 2.3 : 1.4}
                      />
                      <text
                        x={point.x}
                        y={point.y + 3}
                        fill="#f8fafc"
                        fontSize="10"
                        textAnchor="middle"
                      >
                        {point.kind.slice(0, 3).toUpperCase()}
                      </text>
                      <text
                        x={point.x}
                        y={point.y + 36}
                        fill="#cbd5e1"
                        fontSize="11"
                        textAnchor="middle"
                      >
                        {point.label.length > 22 ? `${point.label.slice(0, 22)}…` : point.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <div
              className="border-l p-3 space-y-2 overflow-y-auto"
              style={{ borderColor: THEME.surface.inputBorder, background: "#111827" }}
            >
              <p className="text-xs font-semibold text-slate-100">Детали узла</p>
              {!activeNodeId ? (
                <p className="text-xs text-slate-400">Выберите узел в графе.</p>
              ) : (
                (() => {
                  const selected = points.find((point) => point.id === activeNodeId) ?? null;
                  if (!selected) return <p className="text-xs text-slate-400">Узел не найден.</p>;
                  return (
                    <div className="space-y-2">
                      <p className="text-sm text-slate-100">{selected.label}</p>
                      <p className="text-xs text-slate-400">Тип: {selected.kind}</p>
                      <div className="flex flex-wrap gap-1">
                        {selected.chunkIds.slice(0, 4).map((chunkId) => (
                          <button
                            key={`${selected.id}-${chunkId}`}
                            type="button"
                            onClick={() => onJumpToChunk(chunkId)}
                            className="px-2 py-1 rounded text-[11px] border text-slate-200"
                            style={{
                              borderColor: THEME.warning.border,
                              background: THEME.warning.subtleBg,
                            }}
                          >
                            к фрагменту
                          </button>
                        ))}
                      </div>
                      {selected.kind === "conflict" && (
                        <button
                          type="button"
                          onClick={onOpenConflicts}
                          className="px-2 py-1 rounded text-[11px] border text-slate-200"
                          style={{ borderColor: THEME.surface.inputBorder }}
                        >
                          открыть в конфликтах
                        </button>
                      )}
                    </div>
                  );
                })()
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
