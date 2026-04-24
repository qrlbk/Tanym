export type GraphCamera = {
  zoom: number;
  scrollLeft: number;
  scrollTop: number;
};

export type GraphViewport = {
  width: number;
  height: number;
  contentWidth: number;
  contentHeight: number;
};

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function normalizeWheelDelta(input: {
  deltaY: number;
  deltaMode?: number;
}): number {
  const mode = input.deltaMode ?? 0;
  const scaled = mode === 1 ? input.deltaY * 16 : mode === 2 ? input.deltaY * 120 : input.deltaY;
  return clamp(scaled, -240, 240);
}

export function clampCameraToBounds(camera: GraphCamera, viewport: GraphViewport): GraphCamera {
  const maxLeft = Math.max(0, viewport.contentWidth * camera.zoom - viewport.width);
  const maxTop = Math.max(0, viewport.contentHeight * camera.zoom - viewport.height);
  return {
    ...camera,
    scrollLeft: clamp(camera.scrollLeft, 0, maxLeft),
    scrollTop: clamp(camera.scrollTop, 0, maxTop),
  };
}

export function applyZoomAtPointer(args: {
  camera: GraphCamera;
  viewport: GraphViewport;
  pointerX: number;
  pointerY: number;
  normalizedDelta: number;
  minZoom: number;
  maxZoom: number;
  baseStep: number;
}): GraphCamera {
  const { camera, viewport, pointerX, pointerY, normalizedDelta, minZoom, maxZoom, baseStep } = args;
  const intensity = clamp(Math.abs(normalizedDelta) / 120, 0.2, 2);
  const nextZoom = clamp(
    camera.zoom + (normalizedDelta < 0 ? baseStep : -baseStep) * intensity,
    minZoom,
    maxZoom,
  );
  if (nextZoom === camera.zoom) return camera;
  const worldX = (camera.scrollLeft + pointerX) / camera.zoom;
  const worldY = (camera.scrollTop + pointerY) / camera.zoom;
  const next: GraphCamera = {
    zoom: Number(nextZoom.toFixed(3)),
    scrollLeft: worldX * nextZoom - pointerX,
    scrollTop: worldY * nextZoom - pointerY,
  };
  return clampCameraToBounds(next, viewport);
}

export function centerOnNode(args: {
  camera: GraphCamera;
  viewport: GraphViewport;
  nodeX: number;
  nodeY: number;
}): GraphCamera {
  const { camera, viewport, nodeX, nodeY } = args;
  const next = {
    ...camera,
    scrollLeft: nodeX * camera.zoom - viewport.width / 2,
    scrollTop: nodeY * camera.zoom - viewport.height / 2,
  };
  return clampCameraToBounds(next, viewport);
}

export function fitToGraphBounds(args: {
  viewport: GraphViewport;
  minZoom: number;
  maxZoom: number;
  padding?: number;
}): GraphCamera {
  const { viewport, minZoom, maxZoom, padding = 48 } = args;
  const fitZoom = Math.min(
    (viewport.width - padding) / Math.max(1, viewport.contentWidth),
    (viewport.height - padding) / Math.max(1, viewport.contentHeight),
  );
  const zoom = clamp(fitZoom, minZoom, maxZoom);
  const contentW = viewport.contentWidth * zoom;
  const contentH = viewport.contentHeight * zoom;
  return {
    zoom,
    scrollLeft: Math.max(0, (contentW - viewport.width) / 2),
    scrollTop: Math.max(0, (contentH - viewport.height) / 2),
  };
}
