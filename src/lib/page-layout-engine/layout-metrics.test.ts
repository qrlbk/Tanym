import { describe, it, expect, vi, afterEach } from "vitest";
import {
  REFLOW_VIEWPORT_EPS_PX,
  contentAreaBottomScreen,
  pageBodyOverflows,
  findFitBlockCount,
} from "./layout-metrics";

function mockBody(rect: { top: number; left: number; width: number; height: number }, paddingTop = 76) {
  const el = {
    children: [] as unknown as HTMLCollection,
    getBoundingClientRect: () => ({ ...rect, bottom: rect.top + rect.height, right: rect.left + rect.width }),
  } as unknown as HTMLElement;
  vi.spyOn(window, "getComputedStyle").mockReturnValue({
    paddingTop: `${paddingTop}px`,
    paddingBottom: "76px",
  } as CSSStyleDeclaration);
  return el;
}

function mockChild(bottom: number) {
  return {
    getBoundingClientRect: () => ({ bottom, top: 0, left: 0, right: 0, width: 0, height: 0 }),
  } as unknown as HTMLElement;
}

describe("layout-metrics", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("contentAreaBottomScreen scales content height by view scale", () => {
    const body = mockBody({ top: 100, left: 0, width: 400, height: 900 });
    const contentH = 800;
    const at100 = contentAreaBottomScreen(body, contentH, 1);
    expect(at100).toBeCloseTo(100 + (76 + 800) * 1, 5);
    const at125 = contentAreaBottomScreen(body, contentH, 1.25);
    expect(at125).toBeCloseTo(100 + (76 + 800) * 1.25, 5);
  });

  it("pageBodyOverflows is false when last child bottom is within epsilon of limit", () => {
    const body = mockBody({ top: 100, left: 0, width: 400, height: 900 });
    const limit = contentAreaBottomScreen(body, 800, 1);
    Object.defineProperty(body, "children", {
      value: [mockChild(limit + REFLOW_VIEWPORT_EPS_PX - 0.1)],
      configurable: true,
    });
    expect(pageBodyOverflows(body, 800, 1)).toBe(false);
  });

  it("pageBodyOverflows is true when content extends past limit + epsilon", () => {
    const body = mockBody({ top: 100, left: 0, width: 400, height: 900 });
    const limit = contentAreaBottomScreen(body, 800, 1);
    Object.defineProperty(body, "children", {
      value: [mockChild(limit + REFLOW_VIEWPORT_EPS_PX + 2)],
      configurable: true,
    });
    expect(pageBodyOverflows(body, 800, 1)).toBe(true);
  });

  it("findFitBlockCount counts sequential children that fit", () => {
    const body = mockBody({ top: 100, left: 0, width: 400, height: 900 });
    const limit = contentAreaBottomScreen(body, 800, 1);
    const c1 = mockChild(limit - 50);
    const c2 = mockChild(limit - 10);
    const c3 = mockChild(limit + 100);
    Object.defineProperty(body, "children", {
      value: [c1, c2, c3],
      configurable: true,
    });
    expect(findFitBlockCount(body, 800, 1)).toBe(2);
  });
});
