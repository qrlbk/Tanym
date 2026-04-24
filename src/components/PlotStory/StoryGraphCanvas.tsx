"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import { Minus, Plus, RotateCcw, ScanSearch, Crosshair } from "lucide-react";
import { useEditorContext } from "@/components/Editor/EditorProvider";
import { useUIStore } from "@/stores/uiStore";
import { usePlotStoryStore } from "@/stores/plotStoryStore";
import { computePlotChunks } from "@/lib/plot-index/chunks";
import { buildStoryGraph } from "@/lib/plot-index/story-graph";
import { THEME } from "@/lib/theme/colors";
import {
  applyZoomAtPointer,
  centerOnNode,
  clamp,
  clampCameraToBounds,
  fitToGraphBounds,
  normalizeWheelDelta,
  type GraphCamera,
  type GraphViewport,
} from "./StoryGraphCanvas.camera";

type NodePoint = {
  id: string;
  x: number;
  y: number;
  label: string;
  kind: string;
  chunkIds: string[];
};

const NODE_COLORS: Record<string, { fill: string; stroke: string }> = {
  character: { fill: "#334155", stroke: "#94a3b8" },
  event: { fill: "#1d4ed8", stroke: "#93c5fd" },
  object: { fill: "#065f46", stroke: "#6ee7b7" },
  mystery: { fill: "#5b21b6", stroke: "#c4b5fd" },
  promise: { fill: "#92400e", stroke: "#fcd34d" },
  goal: { fill: "#0e7490", stroke: "#67e8f9" },
  conflict: { fill: "#7f1d1d", stroke: "#fca5a5" },
};

const EDGE_LABELS: Partial<Record<string, string>> = {
  connected: "связь",
  conflicts: "конфликт",
  drives: "мотивирует",
  leads_to: "ведет к",
  costs: "цена",
  resolves: "разрешает",
};

export default function StoryGraphCanvas() {
  const MIN_ZOOM = 0.45;
  const MAX_ZOOM = 2.4;
  const ZOOM_STEP_BASE = 0.08; // balanced profile
  const DRAG_THRESHOLD_PX = 4;

  const editor = useEditorContext();
  const setWorkspaceView = useUIStore((s) => s.setWorkspaceView);
  const setActiveSceneId = useUIStore((s) => s.setActiveSceneId);
  const facts = usePlotStoryStore((s) => s.facts);
  const relations = usePlotStoryStore((s) => s.relations);
  const salientObjects = usePlotStoryStore((s) => s.salientObjects);
  const warnings = usePlotStoryStore((s) => s.consistencyWarnings);
  const reasoningSignals = usePlotStoryStore((s) => s.reasoningSignals);
  const causalChains = usePlotStoryStore((s) => s.causalChains);
  const motivationAssessments = usePlotStoryStore((s) => s.motivationAssessments);
  const consequenceAssessments = usePlotStoryStore((s) => s.consequenceAssessments);
  const chunkSceneMap = usePlotStoryStore((s) => s.chunkSceneMap);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [camera, setCamera] = useState<GraphCamera>({
    zoom: 1,
    scrollLeft: 0,
    scrollTop: 0,
  });
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [isMiniDrag, setIsMiniDrag] = useState(false);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const didDragRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const dragRef = useRef<{
    active: boolean;
    x: number;
    y: number;
    left: number;
    top: number;
    thresholdPassed: boolean;
  }>({
    active: false,
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    thresholdPassed: false,
  });
  const miniSvgRef = useRef<SVGSVGElement | null>(null);
  const cameraCacheRef = useRef<GraphCamera>({
    zoom: 1,
    scrollLeft: 0,
    scrollTop: 0,
  });

  const chunkLookup = useMemo(() => {
    if (!editor) return {} as Record<string, { from: number; label: string }>;
    return computePlotChunks(editor).reduce<Record<string, { from: number; label: string }>>((acc, chunk) => {
      acc[chunk.id] = { from: chunk.from, label: chunk.label };
      return acc;
    }, {});
  }, [editor]);

  const graph = useMemo(
    () =>
      buildStoryGraph({
        facts,
        relations,
        salientObjects,
        warnings,
        reasoningSignals,
        causalChains,
        motivationAssessments,
        consequenceAssessments,
      }),
    [
      facts,
      relations,
      salientObjects,
      warnings,
      reasoningSignals,
      causalChains,
      motivationAssessments,
      consequenceAssessments,
    ],
  );

  const width = 1600;
  const height = 980;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.27;
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
  const pointById = useMemo(() => new Map(points.map((point) => [point.id, point])), [points]);

  const linkedNodeIds = useMemo(() => {
    if (!activeNodeId) return new Set<string>();
    const set = new Set<string>([activeNodeId]);
    for (const edge of graph.edges) {
      if (edge.fromNodeId === activeNodeId) set.add(edge.toNodeId);
      if (edge.toNodeId === activeNodeId) set.add(edge.fromNodeId);
    }
    return set;
  }, [activeNodeId, graph.edges]);
  const nodeTypeStats = useMemo(() => {
    const counts = new Map<string, number>();
    for (const node of graph.nodes) {
      counts.set(node.kind, (counts.get(node.kind) ?? 0) + 1);
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [graph.nodes]);
  const nodeDegree = useMemo(() => {
    const out = new Map<string, number>();
    for (const edge of graph.edges) {
      out.set(edge.fromNodeId, (out.get(edge.fromNodeId) ?? 0) + 1);
      out.set(edge.toNodeId, (out.get(edge.toNodeId) ?? 0) + 1);
    }
    return out;
  }, [graph.edges]);
  const topNodes = useMemo(() => {
    return points
      .map((point) => ({ ...point, degree: nodeDegree.get(point.id) ?? 0 }))
      .sort((a, b) => b.degree - a.degree)
      .slice(0, 5);
  }, [nodeDegree, points]);

  const miniScale = 0.12;
  const miniViewport = useMemo(
    () => ({
      x: camera.scrollLeft / camera.zoom,
      y: camera.scrollTop / camera.zoom,
      w: viewportSize.width / camera.zoom,
      h: viewportSize.height / camera.zoom,
    }),
    [camera.scrollLeft, camera.scrollTop, camera.zoom, viewportSize.height, viewportSize.width],
  );
  const activeEdges = useMemo(() => {
    if (!activeNodeId) return [];
    return graph.edges.filter(
      (edge) => edge.fromNodeId === activeNodeId || edge.toNodeId === activeNodeId,
    );
  }, [activeNodeId, graph.edges]);
  const highlightedEdgeIds = useMemo(() => {
    if (hoveredEdgeId) return new Set<string>([hoveredEdgeId]);
    if (!activeNodeId) return new Set<string>();
    return new Set(
      graph.edges
        .filter((edge) => edge.fromNodeId === activeNodeId || edge.toNodeId === activeNodeId)
        .map((edge) => edge.id),
    );
  }, [activeNodeId, graph.edges, hoveredEdgeId]);

  const jumpToChunk = (chunkId: string) => {
    const sceneId = chunkSceneMap[chunkId]?.sceneId ?? null;
    if (sceneId) setActiveSceneId(sceneId);
    const chunk = chunkLookup[chunkId];
    if (editor && chunk) {
      editor.chain().focus().setTextSelection(chunk.from).scrollIntoView().run();
    }
    setWorkspaceView("scene");
  };

  const activePoint = points.find((point) => point.id === activeNodeId) ?? null;
  const activeNeighborLabels = useMemo(() => {
    if (!activeNodeId) return [];
    const out = new Set<string>();
    for (const edge of graph.edges) {
      if (edge.fromNodeId === activeNodeId) {
        out.add(pointById.get(edge.toNodeId)?.label ?? edge.toNodeId);
      } else if (edge.toNodeId === activeNodeId) {
        out.add(pointById.get(edge.fromNodeId)?.label ?? edge.fromNodeId);
      }
    }
    return [...out];
  }, [activeNodeId, graph.edges, pointById]);

  const getViewport = useCallback((): GraphViewport | null => {
    if (!viewportRef.current) return null;
    return {
      width: viewportRef.current.clientWidth,
      height: viewportRef.current.clientHeight,
      contentWidth: width,
      contentHeight: height,
    };
  }, [height, width]);

  const applyCamera = useCallback((next: GraphCamera) => {
    const viewport = getViewport();
    if (!viewport) return;
    const bounded = clampCameraToBounds(next, viewport);
    cameraCacheRef.current = bounded;
    setCamera(bounded);
    if (viewportRef.current) {
      viewportRef.current.scrollLeft = bounded.scrollLeft;
      viewportRef.current.scrollTop = bounded.scrollTop;
    }
  }, [getViewport]);

  const centerOnCanvasPoint = useCallback((x: number, y: number) => {
    const viewport = getViewport();
    if (!viewport) return;
    applyCamera(centerOnNode({ camera: cameraCacheRef.current, viewport, nodeX: x, nodeY: y }));
  }, [applyCamera, getViewport]);

  const fitGraph = useCallback(() => {
    const viewport = getViewport();
    if (!viewport) return;
    applyCamera(
      fitToGraphBounds({
        viewport,
        minZoom: MIN_ZOOM,
        maxZoom: MAX_ZOOM,
      }),
    );
  }, [MAX_ZOOM, MIN_ZOOM, applyCamera, getViewport]);

  useEffect(() => {
    const updateViewportSize = () => {
      if (!viewportRef.current) return;
      setViewportSize({
        width: viewportRef.current.clientWidth,
        height: viewportRef.current.clientHeight,
      });
    };
    updateViewportSize();
    window.addEventListener("resize", updateViewportSize);
    return () => {
      window.removeEventListener("resize", updateViewportSize);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        setSpacePressed(true);
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "0") {
        event.preventDefault();
        fitGraph();
        return;
      }
      if (event.key === "0") {
        event.preventDefault();
        fitGraph();
      } else if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        applyCamera({
          ...cameraCacheRef.current,
          zoom: clamp(cameraCacheRef.current.zoom + 0.1, MIN_ZOOM, MAX_ZOOM),
        });
      } else if (event.key === "-" || event.key === "_") {
        event.preventDefault();
        applyCamera({
          ...cameraCacheRef.current,
          zoom: clamp(cameraCacheRef.current.zoom - 0.1, MIN_ZOOM, MAX_ZOOM),
        });
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        setSpacePressed(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [fitGraph, applyCamera]);

  useEffect(() => {
    const viewport = getViewport();
    if (!viewport) return;
    applyCamera({
      ...cameraCacheRef.current,
      zoom: cameraCacheRef.current.zoom,
      scrollLeft: cameraCacheRef.current.scrollLeft,
      scrollTop: cameraCacheRef.current.scrollTop,
    });
  }, [applyCamera, getViewport]);

  const onWheelCanvas = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const viewport = getViewport();
    if (!viewport || !viewportRef.current) return;
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    const rect = viewportRef.current.getBoundingClientRect();
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const normalizedDelta = normalizeWheelDelta({
      deltaY: event.deltaY,
      deltaMode: event.deltaMode,
    });
    rafRef.current = requestAnimationFrame(() => {
      applyCamera(
        applyZoomAtPointer({
          camera: cameraCacheRef.current,
          viewport,
          pointerX,
          pointerY,
          normalizedDelta,
          minZoom: MIN_ZOOM,
          maxZoom: MAX_ZOOM,
          baseStep: ZOOM_STEP_BASE,
        }),
      );
    });
  };
  const onPointerDownCanvas = (event: PointerEvent<HTMLDivElement>) => {
    if (!viewportRef.current) return;
    const targetEl = event.target as HTMLElement | null;
    const onNode = targetEl?.closest("[data-node-id]") != null;
    const canPan = event.button === 1 || spacePressed || !onNode;
    if (!canPan) return;
    event.preventDefault();
    didDragRef.current = false;
    dragRef.current = {
      active: true,
      x: event.clientX,
      y: event.clientY,
      left: viewportRef.current.scrollLeft,
      top: viewportRef.current.scrollTop,
      thresholdPassed: false,
    };
    viewportRef.current.style.cursor = "grabbing";
  };
  const onPointerMoveCanvas = (event: PointerEvent<HTMLDivElement>) => {
    if (!viewportRef.current || !dragRef.current.active) return;
    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;
    if (!dragRef.current.thresholdPassed) {
      const moved = Math.hypot(dx, dy);
      if (moved < DRAG_THRESHOLD_PX) return;
      dragRef.current.thresholdPassed = true;
    }
    didDragRef.current = true;
    viewportRef.current.scrollLeft = dragRef.current.left - dx;
    viewportRef.current.scrollTop = dragRef.current.top - dy;
    applyCamera({
      ...cameraCacheRef.current,
      scrollLeft: viewportRef.current.scrollLeft,
      scrollTop: viewportRef.current.scrollTop,
    });
  };
  const stopDrag = () => {
    dragRef.current.active = false;
    if (viewportRef.current) viewportRef.current.style.cursor = "grab";
  };

  const getMiniWorldPoint = (event: PointerEvent<SVGSVGElement>): { x: number; y: number } | null => {
    if (!miniSvgRef.current) return null;
    const rect = miniSvgRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / Math.max(rect.width, 1)) * width;
    const y = ((event.clientY - rect.top) / Math.max(rect.height, 1)) * height;
    return { x, y };
  };

  const onMiniPointerDown = (event: PointerEvent<SVGSVGElement>) => {
    const point = getMiniWorldPoint(event);
    if (!point) return;
    const insideRect =
      point.x >= miniViewport.x &&
      point.x <= miniViewport.x + miniViewport.w &&
      point.y >= miniViewport.y &&
      point.y <= miniViewport.y + miniViewport.h;
    setIsMiniDrag(insideRect);
    centerOnCanvasPoint(point.x, point.y);
  };

  const onMiniPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!isMiniDrag) return;
    const point = getMiniWorldPoint(event);
    if (!point) return;
    centerOnCanvasPoint(point.x, point.y);
  };

  const onMiniPointerUp = () => setIsMiniDrag(false);
  const selectedNodeDegree = activePoint ? nodeDegree.get(activePoint.id) ?? 0 : 0;

  return (
    <div className="h-full min-h-0 overflow-hidden" style={{ background: THEME.shell.bg }}>
      <div
        className="h-full min-h-0 overflow-hidden rounded-none border-t"
        style={{ borderColor: THEME.surface.inputBorder }}
      >
        <div
          className="px-4 py-2.5 border-b flex items-center justify-between gap-3"
          style={{ borderColor: THEME.surface.inputBorder, background: THEME.surface.cardMuted }}
        >
          <div className="space-y-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: THEME.text.primary }}>
              Story Graph Workspace
            </p>
            <div className="flex flex-wrap gap-1.5 text-[10px]">
              <span className="px-1.5 py-0.5 rounded border" style={{ borderColor: THEME.surface.inputBorder, color: THEME.text.secondary }}>
                узлы: {graph.nodes.length}
              </span>
              <span className="px-1.5 py-0.5 rounded border" style={{ borderColor: THEME.surface.inputBorder, color: THEME.text.secondary }}>
                связи: {graph.edges.length}
              </span>
              <span className="px-1.5 py-0.5 rounded border" style={{ borderColor: THEME.surface.inputBorder, color: THEME.text.secondary }}>
                выбрано: {activePoint ? 1 : 0}
              </span>
              <span className="px-1.5 py-0.5 rounded border" style={{ borderColor: THEME.surface.inputBorder, color: THEME.text.secondary }}>
                zoom: {Math.round(camera.zoom * 100)}%
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                applyCamera({
                  ...cameraCacheRef.current,
                  zoom: clamp(cameraCacheRef.current.zoom - 0.1, MIN_ZOOM, MAX_ZOOM),
                })
              }
              className="p-1.5 rounded border text-slate-200"
              style={{ borderColor: THEME.surface.inputBorder, color: THEME.text.secondary }}
              title="Zoom out"
            >
              <Minus size={14} />
            </button>
            <button
              type="button"
              onClick={() =>
                applyCamera({
                  ...cameraCacheRef.current,
                  zoom: clamp(cameraCacheRef.current.zoom + 0.1, MIN_ZOOM, MAX_ZOOM),
                })
              }
              className="p-1.5 rounded border text-slate-200"
              style={{ borderColor: THEME.surface.inputBorder, color: THEME.text.secondary }}
              title="Zoom in"
            >
              <Plus size={14} />
            </button>
            <button
              type="button"
              onClick={() =>
                applyCamera({
                  ...cameraCacheRef.current,
                  zoom: 1,
                })
              }
              className="p-1.5 rounded border text-slate-200"
              style={{ borderColor: THEME.surface.inputBorder, color: THEME.text.secondary }}
              title="Reset zoom"
            >
              <RotateCcw size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveNodeId(null);
                fitGraph();
              }}
              className="p-1.5 rounded border text-slate-200"
              style={{ borderColor: THEME.surface.inputBorder, color: THEME.text.secondary }}
              title="Fit view"
            >
              <ScanSearch size={14} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_320px] h-[calc(100%-58px)]">
          <div
            ref={viewportRef}
            className="relative min-h-0 overflow-auto"
            style={{
              cursor: "grab",
              background:
                "radial-gradient(circle_at_center, rgba(71,85,105,0.18), rgba(15,23,42,0.92)), repeating-linear-gradient(0deg, transparent 0, transparent 39px, rgba(148,163,184,0.07) 40px), repeating-linear-gradient(90deg, transparent 0, transparent 39px, rgba(148,163,184,0.07) 40px)",
            }}
            onWheel={onWheelCanvas}
            onPointerDown={onPointerDownCanvas}
            onPointerMove={onPointerMoveCanvas}
            onPointerUp={stopDrag}
            onPointerLeave={stopDrag}
          >
            <div
              className="origin-top-left"
              style={{ transform: `scale(${camera.zoom})`, width: width * camera.zoom, height: height * camera.zoom }}
            >
              <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-full"
                role="img"
                aria-label="Story graph canvas"
              >
                {graph.edges.map((edge) => {
                  const from = pointById.get(edge.fromNodeId);
                  const to = pointById.get(edge.toNodeId);
                  if (!from || !to) return null;
                  const highlighted = highlightedEdgeIds.has(edge.id);
                  return (
                    <g key={edge.id}>
                      <line
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        stroke={highlighted ? "#a78bfa" : "#475569"}
                        strokeWidth={highlighted ? 2.4 : 1.3}
                        opacity={highlighted ? 1 : 0.7}
                        onMouseEnter={() => setHoveredEdgeId(edge.id)}
                        onMouseLeave={() => setHoveredEdgeId((prev) => (prev === edge.id ? null : prev))}
                      />
                      {highlighted && (
                        <text
                          x={(from.x + to.x) / 2}
                          y={(from.y + to.y) / 2}
                          fill="#cbd5e1"
                          fontSize="10"
                          textAnchor="middle"
                        >
                          {EDGE_LABELS[edge.kind] ?? edge.kind}
                        </text>
                      )}
                    </g>
                  );
                })}
                {points.map((point) => {
                  const focused = activeNodeId === point.id;
                  const dimmed = activeNodeId != null && !linkedNodeIds.has(point.id);
                  const palette = NODE_COLORS[point.kind] ?? NODE_COLORS.event;
                  return (
                    <g
                      key={point.id}
                      data-node-id={point.id}
                      onClick={() => {
                        if (didDragRef.current) return;
                        setActiveNodeId(point.id);
                      }}
                      onDoubleClick={() => {
                        setActiveNodeId(point.id);
                        centerOnCanvasPoint(point.x, point.y);
                      }}
                      style={{ cursor: "pointer" }}
                      opacity={dimmed ? 0.3 : 1}
                    >
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={focused ? 22 : 18}
                        fill={focused ? "#8b5cf6" : palette.fill}
                        stroke={focused ? "#c4b5fd" : palette.stroke}
                        strokeWidth={focused ? 2.5 : 1.5}
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
                      <text x={point.x} y={point.y + 34} fill="#e2e8f0" fontSize="10.5" textAnchor="middle">
                        {point.label.length > 20 ? `${point.label.slice(0, 20)}…` : point.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
            <div
              className="absolute left-4 top-4 rounded border px-2 py-1.5"
              style={{ borderColor: THEME.surface.inputBorder, background: "rgba(17,24,39,0.86)" }}
            >
              <p className="text-[10px] mb-1" style={{ color: THEME.text.muted }}>
                Типы узлов
              </p>
              <div className="flex flex-wrap gap-1 max-w-[300px]">
                {nodeTypeStats.map(([kind, count]) => (
                  <span
                    key={kind}
                    className="px-1.5 py-0.5 rounded border text-[10px]"
                    style={{ borderColor: THEME.surface.inputBorder, color: THEME.text.secondary }}
                  >
                    {kind}: {count}
                  </span>
                ))}
              </div>
            </div>
            <div
              className="absolute right-[338px] bottom-4 rounded border p-2"
              style={{ borderColor: THEME.surface.inputBorder, background: "rgba(17,24,39,0.9)" }}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <p className="text-[10px]" style={{ color: THEME.text.muted }}>
                  Overview
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (activePoint) centerOnCanvasPoint(activePoint.x, activePoint.y);
                  }}
                  className="inline-flex items-center gap-1 px-1 py-0.5 rounded border text-[10px]"
                  style={{ borderColor: THEME.surface.inputBorder, color: THEME.text.secondary }}
                  title="Центрировать на выбранном узле"
                >
                  <Crosshair size={10} />
                </button>
              </div>
              <svg
                ref={miniSvgRef}
                width={Math.round(width * (miniScale * 0.85))}
                height={Math.round(height * (miniScale * 0.85))}
                viewBox={`0 0 ${width} ${height}`}
                className="block"
                onPointerDown={onMiniPointerDown}
                onPointerMove={onMiniPointerMove}
                onPointerUp={onMiniPointerUp}
                onPointerLeave={onMiniPointerUp}
              >
                {graph.edges.map((edge) => {
                  const from = pointById.get(edge.fromNodeId);
                  const to = pointById.get(edge.toNodeId);
                  if (!from || !to) return null;
                  return (
                    <line
                      key={`mini-${edge.id}`}
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke="#475569"
                      strokeWidth={1}
                      opacity={0.65}
                    />
                  );
                })}
                {points.map((point) => (
                  <circle
                    key={`mini-node-${point.id}`}
                    cx={point.x}
                    cy={point.y}
                    r={7}
                    fill={activeNodeId === point.id ? "#8b5cf6" : "#64748b"}
                  />
                ))}
                <rect
                  x={miniViewport.x}
                  y={miniViewport.y}
                  width={miniViewport.w}
                  height={miniViewport.h}
                  fill="none"
                  stroke="#c4b5fd"
                  strokeWidth={2}
                />
              </svg>
              <p className="mt-1 text-[10px]" style={{ color: THEME.text.muted }}>
                viewport: {Math.max(0, Math.round(miniViewport.w))} × {Math.max(0, Math.round(miniViewport.h))}
              </p>
            </div>
          </div>
          <aside
            className="border-l p-3 space-y-3 overflow-y-auto"
            style={{ borderColor: THEME.surface.inputBorder, background: THEME.surface.cardMuted }}
          >
            <p className="text-xs font-semibold" style={{ color: THEME.text.primary }}>
              Детали узла
            </p>
            {!activePoint ? (
              <div className="space-y-3">
                <p className="text-xs" style={{ color: THEME.text.muted }}>
                  Выберите узел в графе, чтобы открыть связи и быстрые действия.
                </p>
                <div className="rounded border p-2.5 space-y-2" style={{ borderColor: THEME.surface.inputBorder, background: THEME.surface.card }}>
                  <p className="text-[11px] font-semibold" style={{ color: THEME.text.secondary }}>
                    Быстрые инсайты
                  </p>
                  <p className="text-[11px]" style={{ color: THEME.text.muted }}>
                    Конфликтов: {graph.nodes.filter((node) => node.kind === "conflict").length}
                  </p>
                  <div className="space-y-1">
                    {topNodes.map((node) => (
                      <button
                        key={node.id}
                        type="button"
                        onClick={() => setActiveNodeId(node.id)}
                        className="w-full text-left text-[11px] rounded px-2 py-1 border"
                        style={{ borderColor: THEME.surface.inputBorder, color: THEME.text.secondary, background: "transparent" }}
                      >
                        {node.label} · связей {node.degree}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="rounded border p-2.5 space-y-1" style={{ borderColor: THEME.surface.inputBorder, background: THEME.surface.card }}>
                  <p className="text-sm" style={{ color: THEME.text.primary }}>{activePoint.label}</p>
                  <p className="text-xs" style={{ color: THEME.text.muted }}>Тип: {activePoint.kind}</p>
                  <p className="text-xs" style={{ color: THEME.text.muted }}>
                    Связей: {activeEdges.length} · centrality: {selectedNodeDegree}
                  </p>
                </div>
                {activeNeighborLabels.length > 0 && (
                  <div className="space-y-1 rounded border p-2.5" style={{ borderColor: THEME.surface.inputBorder, background: THEME.surface.card }}>
                    <p className="text-xs" style={{ color: THEME.text.secondary }}>Связанные узлы</p>
                    <div className="flex flex-wrap gap-1">
                      {activeNeighborLabels.slice(0, 8).map((label) => (
                        <span
                          key={`${activePoint.id}-${label}`}
                          className="px-2 py-0.5 rounded text-[10px] border"
                          style={{ borderColor: THEME.surface.inputBorder, color: THEME.text.secondary }}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {activeEdges.length > 0 && (
                  <div className="space-y-1 rounded border p-2.5" style={{ borderColor: THEME.surface.inputBorder, background: THEME.surface.card }}>
                    <p className="text-xs" style={{ color: THEME.text.secondary }}>Типы связей</p>
                    <div className="flex flex-wrap gap-1">
                      {activeEdges.map((edge) => (
                        <span
                          key={edge.id}
                          className="px-2 py-0.5 rounded text-[10px] border text-slate-200"
                          style={{ borderColor: "#5b21b6", background: "rgba(139,92,246,0.15)" }}
                        >
                          {EDGE_LABELS[edge.kind] ?? edge.kind}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-wrap gap-1 rounded border p-2.5" style={{ borderColor: THEME.surface.inputBorder, background: THEME.surface.card }}>
                  {activePoint.chunkIds.length === 0 && (
                    <p className="text-xs" style={{ color: THEME.text.muted }}>
                      Нет прямых chunk-ссылок для этого узла. Это агрегированная связь.
                    </p>
                  )}
                  {activePoint.chunkIds.slice(0, 6).map((chunkId) => (
                    <button
                      key={`${activePoint.id}-${chunkId}`}
                      type="button"
                      onClick={() => jumpToChunk(chunkId)}
                      className="px-2 py-1 rounded text-[11px] border text-slate-200"
                      style={{ borderColor: THEME.warning.border, background: THEME.warning.subtleBg }}
                    >
                      к фрагменту
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
