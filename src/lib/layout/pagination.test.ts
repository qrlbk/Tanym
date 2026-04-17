import { describe, expect, it } from "vitest";
import { paginatePageBlocks } from "./pagination";

describe("paginatePageBlocks", () => {
  it("fits sequential blocks until overflow", () => {
    const result = paginatePageBlocks(
      [
        { blockId: "a", height: 100 },
        { blockId: "b", height: 120 },
        { blockId: "c", height: 90 },
      ],
      230,
    );
    expect(result.fitCount).toBe(2);
    expect(result.overflowed).toBe(true);
    expect(result.oversizedFirstBlock).toBe(false);
  });

  it("keeps at least first block when it exceeds page height", () => {
    const result = paginatePageBlocks(
      [
        { blockId: "a", height: 1200 },
        { blockId: "b", height: 100 },
      ],
      1000,
    );
    expect(result.fitCount).toBe(1);
    expect(result.overflowed).toBe(true);
    expect(result.oversizedFirstBlock).toBe(true);
  });
});

