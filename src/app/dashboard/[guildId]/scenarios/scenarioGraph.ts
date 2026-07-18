import type {
  ScenarioActionType,
  ScenarioCondition,
  ScenarioCustom,
  ScenarioStep,
} from "@/lib/db/types";
import { MarkerType } from "@xyflow/react";
import type { Edge, Node } from "@xyflow/react";

/** Node id reserved for the trigger source (always rendered as a visual entry point). */
export const TRIGGER_NODE_ID = "__trigger__";

export type ScenarioNodeData = {
  kind: "trigger" | "step";
  actionType?: ScenarioActionType;
  step?: ScenarioStep;
};

export type ScenarioEdgeData = {
  /** "default" = trigger→step (entry, not stored as onSuccess/onFailure); "success" / "fail" = step→step. */
  branch: "success" | "fail" | "default";
};

const ARROW_MARKER = { type: MarkerType.ArrowClosed as const, width: 16, height: 16 };

/**
 * Convert a `ScenarioCustom.steps` array plus trigger to ReactFlow nodes/edges.
 * The trigger node is always present as a visual canvas entry point. Only
 * `step.onSuccess`/`onFailure` become edges; no auto-edge from the trigger is
 * synthesised — the user wires the entry themselves (default branch).
 */
export function stepsToNodesEdges(scenario: ScenarioCustom): {
  nodes: Node<ScenarioNodeData>[];
  edges: Edge<ScenarioEdgeData>[];
} {
  const triggerNode: Node<ScenarioNodeData> = {
    id: TRIGGER_NODE_ID,
    type: "scenarioTrigger",
    position: { x: 0, y: 200 },
    data: { kind: "trigger" },
    deletable: false,
  };

  const sortedSteps = [...scenario.steps].sort((a, b) => a.order - b.order);
  const stepNodes: Node<ScenarioNodeData>[] = sortedSteps.map((step, i) => ({
    id: step.id,
    type: "scenarioStep",
    position: { x: 320 + (i % 4) * 300, y: 40 + (i % 3) * 160 },
    data: { kind: "step" as const, actionType: step.action.type, step },
  }));

  const edges: Edge<ScenarioEdgeData>[] = [];
  for (const step of sortedSteps) {
    if (step.onSuccess) edges.push(makeEdge(step.id, step.onSuccess, "success"));
    if (step.onFailure) edges.push(makeEdge(step.id, step.onFailure, "fail"));
  }

  return { nodes: [triggerNode, ...stepNodes], edges };
}

function makeEdge(
  source: string,
  target: string,
  branch: "success" | "fail",
): Edge<ScenarioEdgeData> {
  return {
    id: `e-${source}-${target}-${branch}`,
    source,
    target,
    sourceHandle: branch,
    targetHandle: "in",
    type: "smoothstep",
    data: { branch },
    markerEnd: ARROW_MARKER,
    label: branch === "success" ? "✓" : branch === "fail" ? "✗" : undefined,
    className: `scenario-edge scenario-edge-${branch}`,
  };
}

/** Marker shape used when a user draws a fresh edge on the canvas. */
export function canvasEdge(conn: {
  source: string;
  target: string;
  sourceHandle: string | null;
  targetHandle: string | null;
}): Edge<ScenarioEdgeData> {
  const handle = conn.sourceHandle ?? undefined;
  const branch: ScenarioEdgeData["branch"] =
    conn.source === TRIGGER_NODE_ID
      ? "default"
      : handle === "fail"
        ? "fail"
        : handle === "success"
          ? "success"
          : "default";
  return {
    id: `e-${conn.source}-${conn.target}-${branch}`,
    source: conn.source,
    target: conn.target,
    sourceHandle: handle ?? undefined,
    targetHandle: conn.targetHandle ?? "in",
    type: "smoothstep",
    data: { branch } as ScenarioEdgeData,
    markerEnd: ARROW_MARKER,
    label: branch === "success" ? "✓" : branch === "fail" ? "✗" : undefined,
    className: `scenario-edge scenario-edge-${branch}`,
  };
}

export interface StepFactory {
  defaultStep(id: string): ScenarioStep;
}

/**
 * Convert the canvas back to `ScenarioStep[]`.
 * `order` is computed via BFS from the trigger along both success and fail
 * edges (so steps reachable earlier get a smaller order — matching the bot's
 * fallback "next step in order" behaviour). Detached nodes are appended by
 * horizontal position so the array stays deterministic.
 * Hanging onSuccess/onFailure references are dropped silently; the server
 * action is responsible for strict rejection of dangling links.
 */
export function nodesEdgesToSteps(
  nodes: Node<ScenarioNodeData>[],
  edges: Edge<ScenarioEdgeData>[],
  factory: StepFactory,
): ScenarioStep[] {
  const stepNodes = nodes.filter((n) => n.data?.kind === "step");
  const byId = new Map<string, Node<ScenarioNodeData>>();
  for (const n of stepNodes) byId.set(n.id, n);

  // Forward adjacency: source → set<target> (covers both branches).
  const forward = new Map<string, Set<string>>();
  for (const e of edges) {
    if (!byId.has(e.source) || !byId.has(e.target)) continue;
    let s = forward.get(e.source);
    if (!s) {
      s = new Set();
      forward.set(e.source, s);
    }
    s.add(e.target);
  }

  // BFS from the trigger along default (entry) edges, then through success/fail edges.
  const visited = new Set<string>();
  const orderedIds: string[] = [];
  const queue: string[] = [];

  // Seed queue with steps directly reachable from the trigger (entry edges).
  for (const e of edges) {
    if (e.source === TRIGGER_NODE_ID && byId.has(e.target) && !visited.has(e.target)) {
      queue.push(e.target);
      visited.add(e.target);
      orderedIds.push(e.target);
    }
  }
  while (queue.length > 0) {
    const cur = queue.shift()!;
    const next = forward.get(cur);
    if (!next) continue;
    // Visit success-target before fail-target for stable ordering.
    const ordered = [...next].sort((a, b) => {
      const aBranch = edges.find((e) => e.source === cur && e.target === a)?.data?.branch ?? "";
      const bBranch = edges.find((e) => e.source === cur && e.target === b)?.data?.branch ?? "";
      const w = (br: string) => (br === "success" ? 0 : br === "fail" ? 1 : 2);
      return w(aBranch) - w(bBranch);
    });
    for (const t of ordered) {
      if (visited.has(t)) continue;
      visited.add(t);
      orderedIds.push(t);
      queue.push(t);
    }
  }

  // Detached steps (not reachable from trigger): sort by x position, append.
  const detached = stepNodes
    .filter((n) => !visited.has(n.id))
    .sort((a, b) => a.position.x - b.position.x || a.id.localeCompare(b.id))
    .map((n) => n.id);
  orderedIds.push(...detached);

  // Per-step successors from edges (success/fail; default edges ignored).
  const successEdges = new Map<string, string | undefined>();
  const failEdges = new Map<string, string | undefined>();
  for (const e of edges) {
    if (!byId.has(e.source) || !byId.has(e.target)) continue;
    if (e.data?.branch === "success") successEdges.set(e.source, e.target);
    else if (e.data?.branch === "fail") failEdges.set(e.source, e.target);
  }

  return orderedIds.map((id, order) => {
    const node = byId.get(id)!;
    const base = (node.data?.step ?? factory.defaultStep(id)) as ScenarioStep;
    const onSuccess = sanitizeTarget(successEdges.get(id), (t) => byId.has(t));
    const onFailure = sanitizeTarget(failEdges.get(id), (t) => byId.has(t));
    return { ...base, id, order, onSuccess, onFailure };
  });
}

function sanitizeTarget(
  target: string | undefined,
  has: (id: string) => boolean,
): string | undefined {
  if (!target || !has(target)) return undefined;
  return target;
}

export function defaultActionFor(type: ScenarioActionType): ScenarioStep["action"] {
  return { type } as ScenarioStep["action"];
}

export const ACTION_TYPES: ScenarioActionType[] = [
  "show_modal",
  "send_message",
  "send_embed",
  "reply",
  "send_dm",
  "add_role",
  "remove_role",
  "create_thread",
  "set_variable",
  "edit_message",
  "delete_message",
];

export const ACTION_LABELS: Record<ScenarioActionType, string> = {
  show_modal: "Show Modal",
  send_message: "Send Message",
  send_embed: "Send Embed",
  reply: "Reply",
  send_dm: "Send DM",
  add_role: "Add Role",
  remove_role: "Remove Role",
  create_thread: "Create Thread",
  set_variable: "Set Variable",
  edit_message: "Edit Message",
  delete_message: "Delete Message",
};

export const ACTION_icons: Record<ScenarioActionType, string> = {
  show_modal: "actionModal",
  send_message: "actionMessage",
  send_embed: "actionEmbed",
  reply: "actionReply",
  send_dm: "actionDm",
  add_role: "actionRoleAdd",
  remove_role: "actionRoleRemove",
  create_thread: "actionThread",
  set_variable: "actionVar",
  edit_message: "actionEdit",
  delete_message: "actionDelete",
};

export function defaultCondition(): ScenarioCondition {
  return { type: "user", operator: "equals", value: "" };
}
