"use client";

import {
  Background,
  BackgroundVariant,
  type Edge,
  type EdgeChange,
  Handle,
  type Node,
  type NodeChange,
  type NodeProps,
  type NodeTypes,
  type OnNodesDelete,
  Panel,
  Position,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { DashIcon } from "@/components/dashboard/DashIcon";
import type { ScenarioStep } from "@/lib/db/types";
import type { GuildChannelOption } from "@/lib/discord/channels-api";
import type { DiscordRole } from "@/lib/discord/role-style";
import { Button, Column, IconButton, Row, Text } from "@once-ui-system/core";
import type React from "react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  ACTION_LABELS,
  ACTION_icons,
  type ScenarioEdgeData,
  type ScenarioNodeData,
  TRIGGER_NODE_ID,
  canvasEdge,
} from "./scenarioGraph";
import type { ComponentsLibrary } from "./scenariosTypes";

export type ScenarioNode = Node<ScenarioNodeData>;
export type ScenarioEdge = Edge<ScenarioEdgeData>;

const ADD_STEP_TYPES: ScenarioStep["action"]["type"][] = [
  "reply",
  "send_message",
  "send_embed",
  "show_modal",
  "send_dm",
  "add_role",
  "remove_role",
  "create_thread",
  "set_variable",
  "edit_message",
  "delete_message",
];

export interface ScenarioFlowProps {
  guildId: string;
  nodes: ScenarioNode[];
  edges: ScenarioEdge[];
  selectedNodeId: string | null;
  setNodes: React.Dispatch<React.SetStateAction<ScenarioNode[]>>;
  setEdges: React.Dispatch<React.SetStateAction<ScenarioEdge[]>>;
  onCanvasChange: (nodes: ScenarioNode[], edges: ScenarioEdge[]) => void;
  onSelectNode: (id: string | null) => void;
  onRemoveStep: (id: string) => void;
  onAddStep: (actionType: ScenarioStep["action"]["type"]) => void;
  /** Scenario name/description/trigger/restrictions/variables form, rendered as a
   * collapsible overlay inside the canvas instead of a fixed sidebar column. */
  settingsPanel: React.ReactNode;
  library: ComponentsLibrary;
  roles: DiscordRole[];
  channels: GuildChannelOption[];
}

interface ScenarioFlowLibraryContextValue {
  library: ComponentsLibrary;
  roles: DiscordRole[];
  channels: GuildChannelOption[];
}

const ScenarioFlowLibraryContext = createContext<ScenarioFlowLibraryContextValue | null>(null);

const nodeTypes = {
  scenarioTrigger: TriggerNode,
  scenarioStep: StepNode,
} satisfies NodeTypes;

export function ScenarioFlow({
  nodes,
  edges,
  selectedNodeId,
  setNodes,
  setEdges,
  onCanvasChange,
  onSelectNode,
  onRemoveStep,
  onAddStep,
  settingsPanel,
  library,
  roles,
  channels,
}: ScenarioFlowProps) {
  // Make `selected` authoritative on the node objects passed to React Flow so
  // the highlight stays in sync with our editor state (selection can otherwise
  // drift between RF's internal store and ours when nodes are recreated).
  const decoratedNodes = useMemo<ScenarioNode[]>(
    () =>
      nodes.map((n) => ({
        ...n,
        selected: n.id === selectedNodeId,
      })),
    [nodes, selectedNodeId],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((prev) => {
        const next = applyNodeChanges(changes, prev) as ScenarioNode[];
        onCanvasChange(next, edges);
        return next;
      });
    },
    [setNodes, edges, onCanvasChange],
  );
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((prev) => {
        const next = applyEdgeChanges(changes, prev) as ScenarioEdge[];
        onCanvasChange(nodes, next);
        return next;
      });
    },
    [setEdges, nodes, onCanvasChange],
  );

  const onConnect = useCallback(
    (conn: {
      source: string;
      target: string;
      sourceHandle: string | null;
      targetHandle: string | null;
    }) => {
      const edge = canvasEdge(conn) as ScenarioEdge;
      setEdges((prev) => {
        // Replace any existing edge with the same source+branch+sourceHandle so a step
        // only has one success- and one fail-edge out.
        const next = prev.filter(
          (e) =>
            !(
              e.source === edge.source &&
              e.data?.branch === edge.data?.branch &&
              e.sourceHandle === edge.sourceHandle
            ),
        );
        // Disallow duplicate edges to the same target on the same branch.
        if (
          !next.some(
            (e) =>
              e.source === edge.source &&
              e.target === edge.target &&
              e.data?.branch === edge.data?.branch,
          )
        ) {
          next.push(edge);
        }
        onCanvasChange(nodes, next);
        return next;
      });
    },
    [setEdges, nodes, onCanvasChange],
  );

  const onPaneClick = useCallback(() => onSelectNode(null), [onSelectNode]);

  const onNodesDelete: OnNodesDelete<ScenarioNode> = useCallback(
    (deleted) => {
      for (const n of deleted) {
        if (n.data?.kind === "step") onRemoveStep(n.id);
      }
    },
    [onRemoveStep],
  );

  const contextValue = useMemo<ScenarioFlowLibraryContextValue>(
    () => ({ library, roles, channels }),
    [library, roles, channels],
  );

  return (
    <Column fill>
      <ScenarioFlowLibraryContext.Provider value={contextValue}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={decoratedNodes}
            edges={edges}
            nodeTypes={nodeTypes as NodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect as any}
            onNodeClick={(_evt: React.MouseEvent, node: ScenarioNode) => onSelectNode(node.id)}
            onPaneClick={onPaneClick}
            onNodesDelete={onNodesDelete}
            fitView
            deleteKeyCode={["Backspace", "Delete"]}
            proOptions={{ hideAttribution: true }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={16}
              size={1}
              style={{ opacity: 0.5 }}
            />
            <AddStepPanel onAddStep={onAddStep}>{settingsPanel}</AddStepPanel>
            <CanvasControls />
          </ReactFlow>
        </ReactFlowProvider>
      </ScenarioFlowLibraryContext.Provider>
    </Column>
  );
}

function AddStepPanel({
  onAddStep,
  children,
}: {
  onAddStep: (actionType: ScenarioStep["action"]["type"]) => void;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState<"settings" | "steps" | null>(null);
  return (
    <Panel position="top-left">
      <Column
        gap="8"
        padding="8"
        radius="l"
        background="surface"
        border="neutral-medium"
        className="nodrag nopan"
        style={{ boxShadow: "0 6px 16px rgba(0,0,0,0.25)", maxWidth: 334 }}
      >
        <Row gap="16">
          <Button
            size="s"
            variant={open === "settings" ? "primary" : "tertiary"}
            prefixIcon="gear"
            suffixIcon={open === "settings" ? "chevronUp" : "chevronDown"}
            onClick={() => setOpen((v) => (v === "settings" ? null : "settings"))}
          >
            Scenario settings
          </Button>
          <Button
            size="s"
            variant={open === "steps" ? "primary" : "tertiary"}
            prefixIcon="plus"
            suffixIcon={open === "steps" ? "chevronUp" : "chevronDown"}
            onClick={() => setOpen((v) => (v === "steps" ? null : "steps"))}
          >
            Add step
          </Button>
        </Row>
        {open === "steps" && (
          <Row gap="8" wrap>
            {ADD_STEP_TYPES.map((t) => (
              <Button
                key={t}
                size="s"
                variant="secondary"
                prefixIcon={ACTION_icons[t]}
                onClick={() => {
                  onAddStep(t);
                  setOpen(null);
                }}
              >
                {t.replace(/_/g, " ")}
              </Button>
            ))}
          </Row>
        )}
        {open === "settings" && (
          <div className="nowheel" style={{ maxHeight: 600, overflowY: "auto" }}>
            {children}
          </div>
        )}
      </Column>
    </Panel>
  );
}

/** Replaces xyflow's built-in `<Controls>`, whose default styling conflicts with
 * Once UI's global button reset and renders as a blank box — this is a small
 * Once-UI-native zoom/fit panel instead. */
function CanvasControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  return (
    <Panel position="bottom-left">
      <Row
        gap="4"
        padding="4"
        radius="m"
        background="surface"
        border="neutral-weak"
        className="nodrag nopan"
        style={{ boxShadow: "0 6px 16px rgba(0,0,0,0.25)" }}
      >
        <IconButton
          icon="plus"
          variant="ghost"
          size="s"
          tooltip="Zoom in"
          onClick={() => zoomIn()}
        />
        <IconButton
          icon="minus"
          variant="ghost"
          size="s"
          tooltip="Zoom out"
          onClick={() => zoomOut()}
        />
        <IconButton
          icon="maximize"
          variant="ghost"
          size="s"
          tooltip="Fit view"
          onClick={() => fitView()}
        />
      </Row>
    </Panel>
  );
}

function TriggerNode({ data }: NodeProps<ScenarioNode>) {
  const hasTrigger = Boolean((data as ScenarioNodeData | undefined)?.step);
  return (
    <Row
      gap="8"
      vertical="center"
      padding="8"
      radius="m"
      background="surface"
      border="neutral-medium"
      style={{ minWidth: 160, boxShadow: "0 6px 16px rgba(0,0,0,0.25)", overflow: "visible" }}
    >
      <DashIcon name="trigger" size="s" />
      <Text variant="label-strong-s">{hasTrigger ? "Trigger" : "Entry (no trigger)"}</Text>
      <Handle type="source" position={Position.Right} id="success" />
    </Row>
  );
}

/** One-line summary of what a step actually targets, so it's visible on the canvas without opening the side panel. */
function describeStepTarget(
  step: ScenarioStep | undefined,
  ctx: ScenarioFlowLibraryContextValue | null,
): string | null {
  if (!step || !ctx) return null;
  const action = step.action;
  switch (action.type) {
    case "add_role":
    case "remove_role": {
      const role = ctx.roles.find((r) => r.id === action.roleId);
      return role ? role.name : null;
    }
    case "send_message":
    case "send_embed":
    case "edit_message":
    case "create_thread": {
      const channel = ctx.channels.find((c) => c.id === action.channelId);
      return channel ? `#${channel.name}` : "same channel";
    }
    case "show_modal": {
      const modal = ctx.library.modals.find((m) => m.id === action.modalId);
      return modal ? modal.title : null;
    }
    case "send_dm": {
      const embed = ctx.library.embed.find((e) => e.id === action.dmEmbedId);
      return embed ? `DM + ${embed.name || embed.title || "embed"}` : "DM";
    }
    case "set_variable":
      return action.variableName || null;
    default:
      return null;
  }
}

function StepNode({ data, selected }: NodeProps<ScenarioNode>) {
  const step = (data ?? {}).step as ScenarioStep | undefined;
  const actionType = step?.action?.type;
  const hasConditions = (step?.conditions?.length ?? 0) > 0;
  const label = actionType ? (ACTION_LABELS as Record<string, string>)[actionType] : "Step";
  const libraryContext = useContext(ScenarioFlowLibraryContext);
  const target = describeStepTarget(step, libraryContext);
  return (
    <Row
      gap="8"
      padding="8"
      radius="m"
      background="surface"
      border={selected ? "brand-medium" : "neutral-medium"}
      style={{
        minWidth: 190,
        maxWidth: 240,
        boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
        overflow: "visible",
      }}
    >
      <Handle type="target" position={Position.Left} id="in" style={{ top: "50%" }} />

      {actionType && (
        <DashIcon name={ACTION_icons[actionType]} size="s" style={{ flexShrink: 0 }} />
      )}

      <Column gap="4" style={{ minWidth: 0 }}>
        <Text variant="label-strong-s">{label}</Text>
        {step?.name && (
          <Text
            variant="body-default-s"
            onBackground="neutral-weak"
            style={{ wordBreak: "break-word" }}
          >
            {step.name}
          </Text>
        )}
        {target && (
          <Text
            variant="body-default-s"
            onBackground="neutral-weak"
            style={{ wordBreak: "break-word", fontStyle: "italic" }}
          >
            → {target}
          </Text>
        )}
        {hasConditions && (
          <Text variant="label-default-s" onBackground="warning-medium">
            ⚡ {step?.conditions?.length} condition(s)
          </Text>
        )}
      </Column>

      <Handle
        type="source"
        position={Position.Right}
        id="success"
        style={{ top: "35%", background: "#5ac86b" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="fail"
        style={{ top: "65%", background: "#da373c" }}
      />
    </Row>
  );
}
