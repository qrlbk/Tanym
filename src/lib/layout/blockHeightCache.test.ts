import { describe, expect, it } from "vitest";
import {
  clearBlockHeightCache,
  getBlockHeightCache,
  makeBlockHeightCacheKey,
  setBlockHeightCache,
} from "./blockHeightCache";
import {
  bumpLayoutVersionHard,
  getContextVersion,
  getLayoutVersion,
} from "./layoutVersion";

function makeKey() {
  return makeBlockHeightCacheKey({
    blockId: "blk-1",
    contentHash: "c-hash",
    stylesHash: "s-hash",
    contextFingerprint: "ctx",
    widthPx: 640,
    zoom: 1,
    contextVersion: getContextVersion(),
  });
}

describe("blockHeightCache", () => {
  it("returns cached entry for current layoutVersion", () => {
    clearBlockHeightCache();
    const key = makeKey();
    setBlockHeightCache(key, { height: 123 });
    expect(getBlockHeightCache(key)).toEqual({
      height: 123,
      layoutVersion: getLayoutVersion(),
    });
  });

  it("clears cache on hard layout version bump", () => {
    clearBlockHeightCache();
    const key = makeKey();
    setBlockHeightCache(key, { height: 222 });
    expect(getBlockHeightCache(key)?.height).toBe(222);

    bumpLayoutVersionHard();
    expect(getBlockHeightCache(key)).toBeUndefined();
  });
});

