import type { Node as PMNode } from "@tiptap/pm/model";
import { computeContentHash } from "./contentHash";
import {
  buildBlockContext,
  computeContextFingerprint,
} from "./contextFingerprint";
import { getContextVersion, getLayoutVersion } from "./layoutVersion";
import {
  getBlockHeightCache,
  makeBlockHeightCacheKey,
  setBlockHeightCache,
} from "./blockHeightCache";
import { computeStylesHash, readStyleFingerprint } from "./stylesHash";
import { logLayoutDebug } from "./debug";
import { REFLOW_VIEWPORT_EPS_PX } from "../page-layout-engine/layout-metrics";

export const MAX_MEASURE_PER_FRAME = 40;
const MISMATCH_SAMPLE_RATE = 0.1;
let mismatchBucket = 0;
let mismatchTotal = 0;
let mismatchIntervalStarted = false;

function shouldValidateCacheHit(): boolean {
  if (typeof window === "undefined") return false;
  return Math.random() < MISMATCH_SAMPLE_RATE;
}

function recordMismatch(mismatch: boolean): void {
  if (typeof window === "undefined") return;
  if (window.localStorage.getItem("DEBUG_LAYOUT_MISMATCH") !== "1") return;
  mismatchTotal += 1;
  if (mismatch) mismatchBucket += 1;
  if (mismatchIntervalStarted) return;
  mismatchIntervalStarted = true;
  setInterval(() => {
    if (mismatchTotal <= 0) return;
    const ratio = mismatchBucket / mismatchTotal;
    console.debug(
      `[layout] cache-validation mismatch=${(ratio * 100).toFixed(1)}% (${mismatchBucket}/${mismatchTotal})`,
    );
    mismatchBucket = 0;
    mismatchTotal = 0;
  }, 2000);
}

export type MeasuredPageBlock = {
  blockId: string;
  height: number;
  keyHash: string;
  complexLayout: boolean;
  childIndex: number;
};

export type MeasurePageBlocksInput = {
  doc: PMNode;
  pageNode: PMNode;
  pagePos: number;
  bodyEl: HTMLElement;
  zoom: number;
  preferredChildIndex?: number;
  maxMeasurePerPass?: number;
};

type PendingMeasure = {
  childIndex: number;
  childPos: number;
  node: PMNode;
  element: HTMLElement;
  priority: number;
};

function getBlockId(node: PMNode, childPos: number): string {
  const attrs = node.attrs as Record<string, unknown>;
  const id = attrs.blockId;
  if (typeof id === "string" && id) return id;
  return `legacy:${node.type.name}:${childPos}`;
}

function isComplexLayout(node: PMNode): boolean {
  return node.type.name === "table";
}

function collectPendingMeasures(
  pageNode: PMNode,
  pagePos: number,
  bodyEl: HTMLElement,
  preferredChildIndex: number,
): PendingMeasure[] {
  const pending: PendingMeasure[] = [];
  let childPos = pagePos + 1;
  for (let i = 0; i < pageNode.childCount; i++) {
    const node = pageNode.child(i);
    const element = bodyEl.children[i];
    if (!(element instanceof HTMLElement)) {
      childPos += node.nodeSize;
      continue;
    }

    pending.push({
      childIndex: i,
      childPos,
      node,
      element,
      priority: Math.abs(i - preferredChildIndex),
    });
    childPos += node.nodeSize;
  }
  // viewport/near-viewport first
  pending.sort((a, b) => a.priority - b.priority || a.childIndex - b.childIndex);
  return pending;
}

export function measurePageBlocks(
  input: MeasurePageBlocksInput,
): MeasuredPageBlock[] {
  const preferred = input.preferredChildIndex ?? 0;
  const maxMeasures = input.maxMeasurePerPass ?? MAX_MEASURE_PER_FRAME;
  const jobs = collectPendingMeasures(
    input.pageNode,
    input.pagePos,
    input.bodyEl,
    preferred,
  );

  const byBlockId = new Map<string, PendingMeasure>();
  for (const job of jobs) {
    const blockId = getBlockId(job.node, job.childPos);
    if (!byBlockId.has(blockId)) byBlockId.set(blockId, job);
  }

  const out: MeasuredPageBlock[] = [];
  let measuredInPass = 0;

  for (const job of byBlockId.values()) {
    const blockId = getBlockId(job.node, job.childPos);
    const width = Math.max(1, job.element.clientWidth || input.bodyEl.clientWidth);
    const contentHash = computeContentHash(job.node);
    const context = buildBlockContext(input.doc, job.childPos);
    const contextFingerprint = computeContextFingerprint(context);
    const stylesHash = computeStylesHash(
      readStyleFingerprint(job.element, width, input.zoom),
    );
    const keyHash = makeBlockHeightCacheKey({
      blockId,
      contentHash,
      stylesHash,
      contextFingerprint,
      widthPx: width,
      zoom: input.zoom,
      contextVersion: getContextVersion(),
    });

    const cacheEntry = getBlockHeightCache(keyHash);
    if (cacheEntry) {
      if (!isComplexLayout(job.node) && shouldValidateCacheHit()) {
        const liveHeight = Math.max(
          1,
          Math.round(job.element.getBoundingClientRect().height),
        );
        const mismatch =
          Math.abs(liveHeight - cacheEntry.height) > REFLOW_VIEWPORT_EPS_PX;
        recordMismatch(mismatch);
        if (mismatch) {
          setBlockHeightCache(keyHash, { height: liveHeight });
          out.push({
            blockId,
            height: liveHeight,
            keyHash,
            complexLayout: false,
            childIndex: job.childIndex,
          });
          logLayoutDebug({
            blockId,
            keyHash,
            cacheHit: false,
            path: "measure",
            layoutVersion: getLayoutVersion(),
            reason: "eps-mismatch-remeasure",
          });
          continue;
        }
      }
      out.push({
        blockId,
        height: cacheEntry.height,
        keyHash,
        complexLayout: isComplexLayout(job.node),
        childIndex: job.childIndex,
      });
      logLayoutDebug({
        blockId,
        keyHash,
        cacheHit: true,
        path: "cache",
        layoutVersion: getLayoutVersion(),
      });
      continue;
    }

    const rawHeight = job.element.getBoundingClientRect().height;
    const height = Math.max(1, Math.round(rawHeight));

    if (measuredInPass < maxMeasures) {
      setBlockHeightCache(keyHash, { height });
      measuredInPass += 1;
    }

    out.push({
      blockId,
      height,
      keyHash,
      complexLayout: isComplexLayout(job.node),
      childIndex: job.childIndex,
    });
    logLayoutDebug({
      blockId,
      keyHash,
      cacheHit: false,
      path: isComplexLayout(job.node) ? "legacy" : "measure",
      layoutVersion: getLayoutVersion(),
      reason: measuredInPass <= maxMeasures ? undefined : "pass-budget-exceeded",
    });
  }

  out.sort((a, b) => a.childIndex - b.childIndex);
  return out;
}

