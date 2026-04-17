export type PaginationBlock = {
  blockId: string;
  height: number;
  complexLayout?: boolean;
};

export type PaginationResult = {
  fitCount: number;
  overflowed: boolean;
  oversizedFirstBlock: boolean;
};

/**
 * Pure numeric pagination: no DOM access, no measurement calls.
 * Heights are expected to be pre-rounded integer px from measurement adapter.
 */
export function paginatePageBlocks(
  blocks: PaginationBlock[],
  pageInnerHeight: number,
): PaginationResult {
  if (!blocks.length) {
    return { fitCount: 0, overflowed: false, oversizedFirstBlock: false };
  }

  let sum = 0;
  let fitCount = 0;
  for (let i = 0; i < blocks.length; i++) {
    const h = Math.max(0, Math.trunc(blocks[i]!.height));
    if (sum + h > pageInnerHeight) break;
    sum += h;
    fitCount += 1;
  }

  if (fitCount > 0) {
    return {
      fitCount,
      overflowed: fitCount < blocks.length,
      oversizedFirstBlock: false,
    };
  }

  // v1 policy for block > page: keep at least one block on page.
  return {
    fitCount: 1,
    overflowed: blocks.length > 1,
    oversizedFirstBlock: true,
  };
}

