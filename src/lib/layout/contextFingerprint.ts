import type { Node as PMNode, ResolvedPos } from "@tiptap/pm/model";
import { fnv1aHash, stableJoin } from "./hash";

export type BlockContext = {
  parentType: string;
  depth: number;
  listDepth: number;
  parentIndent: number;
};

function countListDepth($pos: ResolvedPos): number {
  let depth = 0;
  for (let d = 0; d <= $pos.depth; d++) {
    const t = $pos.node(d).type.name;
    if (t === "bulletList" || t === "orderedList" || t === "taskList") depth += 1;
  }
  return depth;
}

export function buildBlockContext(doc: PMNode, blockPos: number): BlockContext {
  const $pos = doc.resolve(blockPos);
  const parent = $pos.node(Math.max(0, $pos.depth - 1));
  const parentAttrs = parent.attrs as Record<string, unknown>;
  const parentIndent =
    typeof parentAttrs.indent === "number" ? parentAttrs.indent : 0;

  return {
    parentType: parent.type.name,
    depth: $pos.depth,
    listDepth: countListDepth($pos),
    parentIndent,
  };
}

export function computeContextFingerprint(ctx: BlockContext): string {
  return fnv1aHash(
    stableJoin([ctx.parentType, ctx.depth, ctx.listDepth, ctx.parentIndent]),
  );
}

