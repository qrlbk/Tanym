/**
 * Чистые метрики области набора страницы (viewport) для reflow.
 * Вынесено для тестов и единой точки правды по epsilon.
 */

export const REFLOW_VIEWPORT_EPS_PX = 1.5;

/**
 * Effective content-area height from the live DOM, clamped to the geometry value.
 */
export function effectiveContentH(body: HTMLElement, geometryH: number): number {
  const cs = getComputedStyle(body);
  const pt = parseFloat(cs.paddingTop) || 0;
  const pb = parseFloat(cs.paddingBottom) || 0;
  const domH = body.clientHeight - pt - pb;
  return domH > 0 ? Math.min(geometryH, domH) : geometryH;
}

/**
 * Нижний край области набора (текст) в координатах viewport.
 * Верх body + (верхнее поле + высота области текста) × зум.
 */
export function contentAreaBottomScreen(
  body: HTMLElement,
  contentHeightPx: number,
  scale: number,
): number {
  const s = scale > 0 ? scale : 1;
  const br = body.getBoundingClientRect();
  const pt = parseFloat(getComputedStyle(body).paddingTop) || 0;
  return br.top + (pt + contentHeightPx) * s;
}

export function pageBodyOverflows(
  body: HTMLElement,
  contentH: number,
  scale: number,
): boolean {
  const children = body.children;
  if (!children.length) return false;
  /** Ниже первого экрана getBoundingClientRect иногда расходится с клипом; scrollHeight надёжнее для flex-листа. */
  if (body.scrollHeight > body.clientHeight + REFLOW_VIEWPORT_EPS_PX * 2) {
    return true;
  }
  const limit = contentAreaBottomScreen(body, contentH, scale);
  let maxBottom = 0;
  for (let i = 0; i < children.length; i++) {
    const b = (children[i] as HTMLElement).getBoundingClientRect().bottom;
    if (b > maxBottom) maxBottom = b;
  }
  return maxBottom > limit + REFLOW_VIEWPORT_EPS_PX;
}

/**
 * How many direct children of body fit within the content area?
 * Returns at least 1 (never leave a page completely empty).
 */
export function findFitBlockCount(
  body: HTMLElement,
  contentH: number,
  scale: number,
): number {
  const children = Array.from(body.children) as HTMLElement[];
  if (children.length <= 1) return children.length;
  const limitScreen = contentAreaBottomScreen(body, contentH, scale);
  let fit = 0;
  for (const child of children) {
    if (child.getBoundingClientRect().bottom <= limitScreen + REFLOW_VIEWPORT_EPS_PX) {
      fit++;
    } else {
      break;
    }
  }
  return Math.max(1, fit);
}
