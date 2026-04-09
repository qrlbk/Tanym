export const CM_TO_PX = 37.7953;
export const PT_TO_PX = 96 / 72; // 1pt = 1.333…px at 96 DPI
export const CM_TO_PT = 28.3465;

/** Расстояние между листами в режиме «Разметка страницы» (серая прослойка). */
export const PAGE_GAP_PX = 16;

/**
 * Модель страниц (как в Word, режим «Разметка страницы»):
 *
 * 1) Лист — прямоугольник формата бумаги (A4 и т.д.) в пикселях 96 DPI.
 * 2) Поля — отступы от края листа до «области набора» (текст не должен заходить
 *    в поля при корректной пагинации).
 * 3) Область набора (content box) — прямоугольник внутри полей: ширина =
 *    pageWidth − left − right, высота = pageHeight − top − bottom.
 * 4) Пагинация в DOM: блоки `.tiptap > *` измеряются по высоте; когда сумма
 *    высот на текущей странице превышает `contentHeightPx`, предыдущему блоку
 *    добавляется нижний отступ (имитация конца страницы). Явный разрыв страницы
 *    (`data-page-break`) ведёт себя как конец листа.
 * 5) Визуально лист рисуется отдельным слоем (белый фон + рамка + тень);
 *    редактор — прозрачный слой сверху с теми же числовыми полями, что и макет.
 *
 * Экспортируемые константы оформления приближены к Microsoft Word (серый фон
 * рабочей области, тонкая рамка листа).
 */
export const PAGE_CHROME = {
  /** Фон вокруг листов (рабочая область). */
  workspaceBackground: "#cfcfcf",
  /**
   * Край листа + тень без увеличения габаритов блока (outline через box-shadow),
   * чтобы размер листа ровно совпадал с PAGE_A4_PT в пикселях.
   */
  sheetShadow:
    "0 0 0 1px #9e9e9e, 0 1px 2px rgba(0,0,0,0.07), 0 5px 14px rgba(0,0,0,0.08)",
} as const;

/** Граница области набора (аналог «Показать границы текста» в Word). */
export const TEXT_BOUNDARY_STYLE = "1px dashed #c4c4c4";

export const PAGE_A4_PT = { width: 595.28, height: 841.89 } as const;

export interface Margins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface PageGeometry {
  pageWidthCm: number;
  pageHeightCm: number;
  pageWidthPt: number;
  pageHeightPt: number;
  pageWidthPx: number;
  pageHeightPx: number;
  margins: Margins;
  contentWidthPx: number;
  contentHeightPx: number;
  marginTopPx: number;
  marginBottomPx: number;
  marginLeftPx: number;
  marginRightPx: number;
}

export const PAPER_SIZES = {
  a4: { width: 21, height: 29.7 },
  letter: { width: 21.59, height: 27.94 },
  legal: { width: 21.59, height: 35.56 },
} as const;

export const PAPER_SIZES_PT = {
  a4: { width: PAGE_A4_PT.width, height: PAGE_A4_PT.height },
  letter: { width: 612, height: 792 },
  legal: { width: 612, height: 1008 },
} as const;

export function computePageGeometry(
  orientation: "portrait" | "landscape",
  margins: Margins,
  paper: keyof typeof PAPER_SIZES = "a4",
): PageGeometry {
  const basePt = PAPER_SIZES_PT[paper];
  const pageWidthPt = orientation === "portrait" ? basePt.width : basePt.height;
  const pageHeightPt = orientation === "portrait" ? basePt.height : basePt.width;
  const pageWidthPx = pageWidthPt * PT_TO_PX;
  const pageHeightPx = pageHeightPt * PT_TO_PX;

  const base = PAPER_SIZES[paper];
  const pageWidthCm = orientation === "portrait" ? base.width : base.height;
  const pageHeightCm = orientation === "portrait" ? base.height : base.width;

  const marginTopPx = margins.top * CM_TO_PX;
  const marginBottomPx = margins.bottom * CM_TO_PX;
  const marginLeftPx = margins.left * CM_TO_PX;
  const marginRightPx = margins.right * CM_TO_PX;

  const contentWidthPx = pageWidthPx - marginLeftPx - marginRightPx;
  const contentHeightPx = pageHeightPx - marginTopPx - marginBottomPx;

  return {
    pageWidthCm,
    pageHeightCm,
    pageWidthPt,
    pageHeightPt,
    pageWidthPx,
    pageHeightPx,
    margins,
    contentWidthPx,
    contentHeightPx,
    marginTopPx,
    marginBottomPx,
    marginLeftPx,
    marginRightPx,
  };
}

export interface PageSlice {
  pageIndex: number;
  blockIndices: number[];
  usedHeight: number;
  startsWithBreak: boolean;
}

export interface PaginationResult {
  pages: PageSlice[];
  pageCount: number;
}

export interface BlockMeasurement {
  index: number;
  height: number;
  isPageBreak: boolean;
  element: Element;
  isSplittable: boolean;
  childHeights?: number[];
}

function startNewPage(
  pages: PageSlice[],
  currentPage: PageSlice,
  startsWithBreak = false,
): PageSlice {
  pages.push(currentPage);
  return {
    pageIndex: pages.length,
    blockIndices: [],
    usedHeight: 0,
    startsWithBreak,
  };
}

/**
 * Try to fit a splittable block (list or table) by counting how many
 * child items/rows fit on the current page. Returns the cumulative
 * height of children that fit, or 0 if none fit.
 */
function fittableChildrenHeight(
  childHeights: number[],
  remainingHeight: number,
): number {
  let accum = 0;
  for (const ch of childHeights) {
    if (accum + ch > remainingHeight) break;
    accum += ch;
  }
  return accum;
}

export function paginateBlocks(
  blocks: BlockMeasurement[],
  contentHeightPx: number,
): PaginationResult {
  const pages: PageSlice[] = [];
  let currentPage: PageSlice = {
    pageIndex: 0,
    blockIndices: [],
    usedHeight: 0,
    startsWithBreak: false,
  };

  for (const block of blocks) {
    if (block.isPageBreak) {
      currentPage.blockIndices.push(block.index);
      currentPage = startNewPage(pages, currentPage, true);
      continue;
    }

    const remaining = contentHeightPx - currentPage.usedHeight;

    if (block.height <= remaining) {
      currentPage.blockIndices.push(block.index);
      currentPage.usedHeight += block.height;
      continue;
    }

    // Block doesn't fit. Try splitting if splittable.
    if (
      block.isSplittable &&
      block.childHeights &&
      block.childHeights.length > 1
    ) {
      const fitted = fittableChildrenHeight(block.childHeights, remaining);
      if (fitted > 0 && fitted < block.height) {
        // Part of the block fits on this page -- we still add the whole
        // block index because we can't split the DOM node. The visual
        // mask handles the cut. But we track it for accurate page height.
        currentPage.blockIndices.push(block.index);
        currentPage.usedHeight += block.height;
        continue;
      }
    }

    // Oversized single block: if nothing else on the page, allow it
    // to overflow (the mask will clip it).
    if (currentPage.blockIndices.length === 0) {
      currentPage.blockIndices.push(block.index);
      currentPage.usedHeight += block.height;
      continue;
    }

    // Otherwise start a new page with this block.
    currentPage = startNewPage(pages, currentPage);
    currentPage.blockIndices.push(block.index);
    currentPage.usedHeight += block.height;
  }

  pages.push(currentPage);

  return {
    pages,
    pageCount: pages.length,
  };
}
