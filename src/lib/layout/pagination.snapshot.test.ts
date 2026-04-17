import { describe, expect, it } from "vitest";
import { paginatePageBlocks, type PaginationBlock } from "./pagination";

/**
 * Snapshot-тесты пагинации на синтетических документах. Пока у нас нет
 * E2E-прогона на реальных TipTap-документах, фиксируем контракт чистой
 * нумерической функции `paginatePageBlocks` на 5 типовых сценариях.
 *
 * Если пагинация сломается при рефакторе layout-движка, эти снапшоты первыми
 * покажут, на каком сценарии.
 */

const PAGE_HEIGHT = 1000;

function paginateAll(blocks: PaginationBlock[]): number[] {
  const pages: number[] = [];
  let rest = [...blocks];
  // Защита от бесконечного цикла, если когда-нибудь сломается инвариант.
  let safety = 1_000;
  while (rest.length > 0 && safety-- > 0) {
    const { fitCount } = paginatePageBlocks(rest, PAGE_HEIGHT);
    pages.push(fitCount);
    rest = rest.slice(fitCount);
  }
  return pages;
}

describe("pagination snapshots — типовые документы", () => {
  it("короткий документ влезает на одну страницу", () => {
    const blocks: PaginationBlock[] = [
      { blockId: "h1", height: 80 },
      { blockId: "p1", height: 200 },
      { blockId: "p2", height: 200 },
    ];
    expect(paginateAll(blocks)).toEqual([3]);
  });

  it("длинный документ: ровные абзацы → равномерное разбиение", () => {
    const blocks: PaginationBlock[] = Array.from({ length: 15 }, (_, i) => ({
      blockId: `p${i}`,
      height: 250,
    }));
    expect(paginateAll(blocks)).toEqual([4, 4, 4, 3]);
  });

  it("документ с большими заголовками: заголовок + абзацы на странице", () => {
    const blocks: PaginationBlock[] = [
      { blockId: "h1", height: 120 },
      { blockId: "p1", height: 300 },
      { blockId: "p2", height: 300 },
      { blockId: "p3", height: 300 },
      { blockId: "h2", height: 120 },
      { blockId: "p4", height: 300 },
      { blockId: "p5", height: 300 },
    ];
    expect(paginateAll(blocks)).toEqual([3, 3, 1]);
  });

  it("таблица/изображение больше высоты страницы: оверсайз-блок стоит один", () => {
    const blocks: PaginationBlock[] = [
      { blockId: "p1", height: 200 },
      { blockId: "p2", height: 200 },
      { blockId: "bigTable", height: 1500 },
      { blockId: "p3", height: 200 },
    ];
    // Первые 2 помещаются (400/1000), дальше — оверсайз-блок один на странице,
    // потом финальный абзац.
    expect(paginateAll(blocks)).toEqual([2, 1, 1]);
  });

  it("первый блок оверсайз: помечается oversizedFirstBlock и один на странице", () => {
    const blocks: PaginationBlock[] = [
      { blockId: "bigHero", height: 1400 },
      { blockId: "p1", height: 200 },
    ];
    const first = paginatePageBlocks(blocks, PAGE_HEIGHT);
    expect(first.fitCount).toBe(1);
    expect(first.oversizedFirstBlock).toBe(true);
    expect(first.overflowed).toBe(true);
    expect(paginateAll(blocks)).toEqual([1, 1]);
  });

  it("пустой ввод — корректный базовый случай", () => {
    const result = paginatePageBlocks([], PAGE_HEIGHT);
    expect(result).toEqual({
      fitCount: 0,
      overflowed: false,
      oversizedFirstBlock: false,
    });
  });
});
