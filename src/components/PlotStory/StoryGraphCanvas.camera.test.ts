import { describe, expect, it } from "vitest";
import {
  applyZoomAtPointer,
  centerOnNode,
  clampCameraToBounds,
  fitToGraphBounds,
  normalizeWheelDelta,
} from "./StoryGraphCanvas.camera";

describe("StoryGraphCanvas camera helpers", () => {
  it("normalizes wheel delta and clamps spikes", () => {
    expect(normalizeWheelDelta({ deltaY: 20 })).toBe(20);
    expect(normalizeWheelDelta({ deltaY: 1000 })).toBe(240);
    expect(normalizeWheelDelta({ deltaY: 2, deltaMode: 1 })).toBe(32);
  });

  it("applies cursor-centric zoom", () => {
    const next = applyZoomAtPointer({
      camera: { zoom: 1, scrollLeft: 0, scrollTop: 0 },
      viewport: { width: 800, height: 600, contentWidth: 1600, contentHeight: 980 },
      pointerX: 400,
      pointerY: 300,
      normalizedDelta: -120,
      minZoom: 0.45,
      maxZoom: 2.4,
      baseStep: 0.08,
    });
    expect(next.zoom).toBeGreaterThan(1);
    expect(next.scrollLeft).toBeGreaterThan(0);
  });

  it("keeps camera inside bounds", () => {
    const next = clampCameraToBounds(
      { zoom: 1.2, scrollLeft: -300, scrollTop: 999999 },
      { width: 800, height: 600, contentWidth: 1600, contentHeight: 980 },
    );
    expect(next.scrollLeft).toBe(0);
    expect(next.scrollTop).toBeLessThanOrEqual(980 * 1.2 - 600);
  });

  it("centers node and fits graph", () => {
    const centered = centerOnNode({
      camera: { zoom: 1, scrollLeft: 0, scrollTop: 0 },
      viewport: { width: 800, height: 600, contentWidth: 1600, contentHeight: 980 },
      nodeX: 1000,
      nodeY: 500,
    });
    expect(centered.scrollLeft).toBeGreaterThan(0);

    const fit = fitToGraphBounds({
      viewport: { width: 800, height: 600, contentWidth: 1600, contentHeight: 980 },
      minZoom: 0.45,
      maxZoom: 2.4,
    });
    expect(fit.zoom).toBeGreaterThan(0.45);
    expect(fit.zoom).toBeLessThanOrEqual(2.4);
  });
});
