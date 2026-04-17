import { getLayoutVersion, subscribeLayoutVersion } from "./layoutVersion";
import { fnv1aHash, stableJoin } from "./hash";

export type BlockHeightCacheKeyInput = {
  blockId: string;
  contentHash: string;
  stylesHash: string;
  contextFingerprint: string;
  widthPx: number;
  zoom: number;
  contextVersion: number;
};

export type BlockHeightCacheEntry = {
  height: number;
  layoutVersion: number;
};

const cache = new Map<string, BlockHeightCacheEntry>();

function buildRawKey(input: BlockHeightCacheKeyInput): string {
  return stableJoin([
    input.blockId,
    input.contentHash,
    input.stylesHash,
    input.contextFingerprint,
    Math.round(input.widthPx),
    input.zoom,
    input.contextVersion,
  ]);
}

export function makeBlockHeightCacheKey(input: BlockHeightCacheKeyInput): string {
  return fnv1aHash(buildRawKey(input));
}

export function getBlockHeightCache(
  key: string,
): BlockHeightCacheEntry | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (entry.layoutVersion !== getLayoutVersion()) return undefined;
  return entry;
}

export function setBlockHeightCache(
  key: string,
  entry: Omit<BlockHeightCacheEntry, "layoutVersion">,
): void {
  cache.set(key, { ...entry, layoutVersion: getLayoutVersion() });
}

export function clearBlockHeightCache(): void {
  cache.clear();
}

subscribeLayoutVersion((kind) => {
  if (kind === "hard") {
    clearBlockHeightCache();
  }
});

