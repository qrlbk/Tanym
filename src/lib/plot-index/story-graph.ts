import type {
  CausalChain,
  ConsequenceAssessment,
  ConsistencyWarning,
  DeepReasoningSignal,
  MotivationAssessment,
  PlotFact,
  PlotRelation,
  SalientObject,
} from "./story-extraction";

export type StoryNodeKind =
  | "character"
  | "event"
  | "object"
  | "mystery"
  | "promise"
  | "goal"
  | "conflict"
  | "decision"
  | "motive"
  | "consequence"
  | "arcBeat";

export type StoryEdgeKind =
  | "cause"
  | "effect"
  | "hides"
  | "knows"
  | "lies"
  | "motivates"
  | "connected"
  | "conflicts"
  | "promises"
  | "foreshadows"
  | "drives"
  | "leads_to"
  | "costs"
  | "resolves"
  | "betrays";

export type StoryNode = {
  id: string;
  key: string;
  kind: StoryNodeKind;
  label: string;
  chunkIds: string[];
  metadata?: Record<string, string>;
};

export type StoryEdge = {
  id: string;
  kind: StoryEdgeKind;
  fromNodeId: string;
  toNodeId: string;
  chunkIds: string[];
};

export type StoryGraph = {
  nodes: StoryNode[];
  edges: StoryEdge[];
};

function slug(input: string): string {
  return input.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "");
}

function guessNodeKindFromFact(fact: PlotFact): StoryNodeKind {
  if (fact.attribute.toLowerCase().includes("goal")) return "goal";
  if (fact.entityType === "character") return "character";
  if (fact.entityType === "event") return "event";
  if (fact.entityType === "object" || fact.entityType === "document") return "object";
  return "event";
}

function relationToEdgeKind(relation: PlotRelation["relation"]): StoryEdgeKind {
  switch (relation) {
    case "enemy":
      return "conflicts";
    case "secret":
      return "hides";
    case "friend":
    case "family":
    case "romantic":
      return "connected";
    case "neutral":
    case "other":
    default:
      return "connected";
  }
}

type NodeBuilder = Omit<StoryNode, "id">;
function upsertNode(map: Map<string, NodeBuilder>, next: NodeBuilder): void {
  const prev = map.get(next.key);
  if (!prev) {
    map.set(next.key, next);
    return;
  }
  map.set(next.key, {
    ...prev,
    kind: prev.kind === "event" ? next.kind : prev.kind,
    chunkIds: Array.from(new Set([...prev.chunkIds, ...next.chunkIds])),
    metadata: { ...(prev.metadata ?? {}), ...(next.metadata ?? {}) },
  });
}

export function buildStoryGraph(args: {
  facts: PlotFact[];
  relations: PlotRelation[];
  salientObjects: SalientObject[];
  warnings: ConsistencyWarning[];
  reasoningSignals?: DeepReasoningSignal[];
  causalChains?: CausalChain[];
  motivationAssessments?: MotivationAssessment[];
  consequenceAssessments?: ConsequenceAssessment[];
}): StoryGraph {
  const {
    facts,
    relations,
    salientObjects,
    warnings,
    reasoningSignals = [],
    causalChains = [],
    motivationAssessments = [],
    consequenceAssessments = [],
  } = args;
  const nodes = new Map<string, NodeBuilder>();
  const edges = new Map<string, StoryEdge>();

  for (const fact of facts) {
    const entityKey = `entity:${slug(fact.entity)}`;
    upsertNode(nodes, {
      key: entityKey,
      kind: guessNodeKindFromFact(fact),
      label: fact.entity,
      chunkIds: fact.chunkIds,
      metadata: fact.narrativeRole ? { narrativeRole: fact.narrativeRole } : undefined,
    });

    const valueLower = fact.value.toLowerCase();
    if (/(тайна|secret|mystery)/i.test(valueLower)) {
      upsertNode(nodes, {
        key: `mystery:${slug(fact.entity)}:${slug(fact.attribute)}`,
        kind: "mystery",
        label: `${fact.entity}: ${fact.attribute}`,
        chunkIds: fact.chunkIds,
      });
    }
    if (/(обещ|promise|foreshadow|предвещ)/i.test(valueLower)) {
      upsertNode(nodes, {
        key: `promise:${slug(fact.entity)}:${slug(fact.attribute)}`,
        kind: "promise",
        label: `${fact.entity}: ${fact.attribute}`,
        chunkIds: fact.chunkIds,
      });
    }
    if (/(цель|goal|motivation|мотив)/i.test(fact.attribute)) {
      upsertNode(nodes, {
        key: `goal:${slug(fact.entity)}:${slug(fact.value)}`,
        kind: "goal",
        label: `${fact.entity}: ${fact.value}`,
        chunkIds: fact.chunkIds,
      });
    }
  }

  for (const obj of salientObjects) {
    upsertNode(nodes, {
      key: `object:${slug(obj.name)}`,
      kind: "object",
      label: obj.name,
      chunkIds: [obj.chunkId],
      metadata: { description: obj.description },
    });
  }

  for (const warning of warnings) {
    const warningNodeKey = `conflict:${slug(warning.key)}`;
    upsertNode(nodes, {
      key: warningNodeKey,
      kind: "conflict",
      label: warning.message,
      chunkIds: [...warning.previousChunkIds, ...warning.newChunkIds],
      metadata: { warningKey: warning.key, warningKind: warning.kind },
    });

    const entityKey = `entity:${slug(warning.entity)}`;
    if (nodes.has(entityKey)) {
      const edgeId = `edge:${slug(entityKey)}:conflicts:${slug(warningNodeKey)}`;
      edges.set(edgeId, {
        id: edgeId,
        kind: "conflicts",
        fromNodeId: entityKey,
        toNodeId: warningNodeKey,
        chunkIds: [...warning.previousChunkIds, ...warning.newChunkIds],
      });
    }
  }

  for (const relation of relations) {
    const fromKey = `entity:${slug(relation.entityA)}`;
    const toKey = `entity:${slug(relation.entityB)}`;
    upsertNode(nodes, {
      key: fromKey,
      kind: "character",
      label: relation.entityA,
      chunkIds: relation.chunkIds,
    });
    upsertNode(nodes, {
      key: toKey,
      kind: "character",
      label: relation.entityB,
      chunkIds: relation.chunkIds,
    });
    const kind = relationToEdgeKind(relation.relation);
    const edgeId = `edge:${slug(fromKey)}:${kind}:${slug(toKey)}`;
    edges.set(edgeId, {
      id: edgeId,
      kind,
      fromNodeId: fromKey,
      toNodeId: toKey,
      chunkIds: relation.chunkIds,
    });
  }

  for (const signal of reasoningSignals) {
    const entityKey = `entity:${slug(signal.entity)}`;
    upsertNode(nodes, {
      key: entityKey,
      kind: "character",
      label: signal.entity,
      chunkIds: signal.chunkIds,
    });
    const signalKind: StoryNodeKind =
      signal.type === "motive"
        ? "motive"
        : signal.type === "decision"
          ? "decision"
          : signal.type === "consequence"
            ? "consequence"
            : "arcBeat";
    const signalKey = `${signal.type}:${slug(signal.entity)}:${slug(signal.summary)}`;
    upsertNode(nodes, {
      key: signalKey,
      kind: signalKind,
      label: signal.summary,
      chunkIds: signal.chunkIds,
      metadata: { confidence: String(signal.confidence) },
    });
    const edgeKind: StoryEdgeKind = signal.type === "motive" ? "drives" : "leads_to";
    const edgeId = `edge:${slug(entityKey)}:${edgeKind}:${slug(signalKey)}`;
    edges.set(edgeId, {
      id: edgeId,
      kind: edgeKind,
      fromNodeId: entityKey,
      toNodeId: signalKey,
      chunkIds: signal.chunkIds,
    });
  }

  for (const chain of causalChains) {
    const decisionKey = `decision:${slug(chain.decision)}`;
    const consequenceKey = `consequence:${slug(chain.consequence)}`;
    upsertNode(nodes, {
      key: decisionKey,
      kind: "decision",
      label: chain.decision,
      chunkIds: chain.chunkIds,
    });
    upsertNode(nodes, {
      key: consequenceKey,
      kind: "consequence",
      label: chain.consequence,
      chunkIds: chain.chunkIds,
    });
    const edgeId = `edge:${slug(decisionKey)}:leads_to:${slug(consequenceKey)}`;
    edges.set(edgeId, {
      id: edgeId,
      kind: "leads_to",
      fromNodeId: decisionKey,
      toNodeId: consequenceKey,
      chunkIds: chain.chunkIds,
    });
  }

  for (const check of motivationAssessments) {
    const entityKey = `entity:${slug(check.entity)}`;
    const motiveKey = `motive:${slug(check.entity)}:${slug(check.motivation)}`;
    upsertNode(nodes, {
      key: motiveKey,
      kind: "motive",
      label: check.motivation,
      chunkIds: check.chunkIds,
    });
    edges.set(`edge:${slug(entityKey)}:drives:${slug(motiveKey)}`, {
      id: `edge:${slug(entityKey)}:drives:${slug(motiveKey)}`,
      kind: "drives",
      fromNodeId: entityKey,
      toNodeId: motiveKey,
      chunkIds: check.chunkIds,
    });
  }

  for (const check of consequenceAssessments) {
    const eventKey = `event:${slug(check.event)}`;
    const consequenceKey = `consequence:${slug(check.reason)}`;
    upsertNode(nodes, {
      key: eventKey,
      kind: "event",
      label: check.event,
      chunkIds: check.chunkIds,
    });
    upsertNode(nodes, {
      key: consequenceKey,
      kind: "consequence",
      label: check.reason,
      chunkIds: check.chunkIds,
    });
    edges.set(`edge:${slug(eventKey)}:${check.verdict === "missing" ? "costs" : "resolves"}:${slug(consequenceKey)}`, {
      id: `edge:${slug(eventKey)}:${check.verdict === "missing" ? "costs" : "resolves"}:${slug(consequenceKey)}`,
      kind: check.verdict === "missing" ? "costs" : "resolves",
      fromNodeId: eventKey,
      toNodeId: consequenceKey,
      chunkIds: check.chunkIds,
    });
  }

  const keyedNodes = [...nodes.entries()].map(([key, node]) => ({
    ...node,
    id: `node:${slug(key)}`,
  }));
  const nodeIdByKey = new Map(keyedNodes.map((node) => [node.key, node.id]));

  return {
    nodes: keyedNodes,
    edges: [...edges.values()]
      .map((edge) => ({
        ...edge,
        fromNodeId: nodeIdByKey.get(edge.fromNodeId) ?? edge.fromNodeId,
        toNodeId: nodeIdByKey.get(edge.toNodeId) ?? edge.toNodeId,
      }))
      .filter(
        (edge) =>
          keyedNodes.some((node) => node.id === edge.fromNodeId) &&
          keyedNodes.some((node) => node.id === edge.toNodeId),
      ),
  };
}
