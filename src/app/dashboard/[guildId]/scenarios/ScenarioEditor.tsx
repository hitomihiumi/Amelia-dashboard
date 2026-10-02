"use client";

import { CommandAccordion } from "@/components/dashboard/CommandAccordion";
import { ChannelPill } from "@/components/dashboard/discord/ChannelPill";
import { ChannelSelect } from "@/components/dashboard/discord/ChannelSelect";
import { LabelSelect } from "@/components/dashboard/discord/LabelSelect";
import { RolePill } from "@/components/dashboard/discord/RolePill";
import { RoleSelect } from "@/components/dashboard/discord/RoleSelect";
import { DiscordPreview } from "@/components/dashboard/discord/preview/DiscordPreview";
import { useT } from "@/i18n/client";
import { generateID } from "@/lib/db/generateID";
import type {
  ScenarioAction,
  ScenarioCustom,
  ScenarioStep,
  ScenarioTriggerType,
} from "@/lib/db/types";
import type { GuildChannelOption } from "@/lib/discord/channels-api";
import type { DiscordRole } from "@/lib/discord/role-style";
import {
  Button,
  Column,
  Flex,
  IconButton,
  Input,
  NumberInput,
  RevealFx,
  Row,
  SegmentedControl,
  Switch,
  Text,
  Textarea,
} from "@once-ui-system/core";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActionNodeForm } from "./ActionNodeForm";
import { type ScenarioEdge, ScenarioFlow, type ScenarioNode } from "./ScenarioFlow";
import { buildPreviewForStep } from "./previewBuild";
import {
  TRIGGER_TYPE_OPTION_LABEL,
  type StepFactory,
  nodesEdgesToSteps,
  stepsToNodesEdges,
} from "./scenarioGraph";
import type { ComponentsLibrary } from "./scenariosTypes";

export interface ScenarioEditorProps {
  guildId: string;
  scenario: ScenarioCustom;
  library: ComponentsLibrary;
  roles: DiscordRole[];
  channels: GuildChannelOption[];
  onChange: (next: ScenarioCustom) => void;
}

const TRIGGER_OPTIONS: ScenarioTriggerType[] = ["button", "select_menu", "modal_submit"];

const stepFactory: StepFactory = {
  defaultStep: (id) => ({ id, order: 0, action: { type: "reply" } }),
};

export function ScenarioEditor({
  guildId,
  scenario,
  library,
  roles,
  channels,
  onChange,
}: ScenarioEditorProps) {
  const t = useT();
  const [nodes, setNodes] = useState<ScenarioNode[]>(() => stepsToNodesEdges(scenario).nodes);
  const [edges, setEdges] = useState<ScenarioEdge[]>(() => stepsToNodesEdges(scenario).edges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [restrictionsOpen, setRestrictionsOpen] = useState(true);
  const [variablesOpen, setVariablesOpen] = useState(false);

  // Keep a ref to the latest scenario so the propagation effect can build the
  // next scenario without capturing a stale closure.
  const scenarioRef = useRef(scenario);
  useEffect(() => {
    scenarioRef.current = scenario;
  }, [scenario]);

  // Reseed canvas when navigating to a different scenario id.
  useEffect(() => {
    const g = stepsToNodesEdges(scenario);
    setNodes(g.nodes);
    setEdges(g.edges);
    setSelectedNodeId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario.id]);

  // Single source of truth: the canvas. Any nodes/edges change recomputes the
  // scenario.steps and pushes it up. Meta changes (name/trigger/etc) bypass
  // this effect by calling onChange directly without touching nodes/edges.
  useEffect(() => {
    const steps = nodesEdgesToSteps(nodes, edges, stepFactory);
    onChange({ ...scenarioRef.current, steps });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges]);

  const updateMeta = useCallback(
    (patch: Partial<ScenarioCustom>) => onChange({ ...scenario, ...patch }),
    [scenario, onChange],
  );

  const updateStepAction = useCallback((stepId: string, action: ScenarioAction) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === stepId && n.data?.kind === "step"
          ? { ...n, data: { ...n.data, step: { ...(n.data.step as ScenarioStep), action } } }
          : n,
      ),
    );
  }, []);

  const updateStepMeta = useCallback((stepId: string, patch: Partial<ScenarioStep>) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === stepId && n.data?.kind === "step"
          ? { ...n, data: { ...n.data, step: { ...(n.data.step as ScenarioStep), ...patch } } }
          : n,
      ),
    );
  }, []);

  const addStep = useCallback(
    (actionType: ScenarioStep["action"]["type"]) => {
      const id = generateID(guildId, "step");
      const stepX = nodes.length === 0 ? 320 : Math.max(...nodes.map((n) => n.position.x)) + 300;
      const node: ScenarioNode = {
        id,
        type: "scenarioStep",
        position: { x: stepX, y: 60 + Math.round(Math.random() * 120) },
        data: { kind: "step", actionType, step: { id, order: 0, action: { type: actionType } } },
      };
      setNodes((prev) => [...prev, node]);
      setSelectedNodeId(id);
    },
    [guildId, nodes],
  );

  const removeStep = useCallback(
    (stepId: string) => {
      setNodes((prev) => prev.filter((n) => n.id !== stepId));
      setEdges((prev) => prev.filter((e) => e.source !== stepId && e.target !== stepId));
      if (selectedNodeId === stepId) setSelectedNodeId(null);
    },
    [selectedNodeId],
  );

  const handleCanvasChange = useCallback((nextNodes: ScenarioNode[], nextEdges: ScenarioEdge[]) => {
    setNodes(nextNodes);
    setEdges(nextEdges);
  }, []);

  const selectedStep = useMemo(() => {
    const node = nodes.find((n) => n.id === selectedNodeId);
    return node?.data?.kind === "step" ? (node.data.step as ScenarioStep) : null;
  }, [nodes, selectedNodeId]);

  const previewMessage = useMemo(() => {
    if (!selectedStep) return null;
    const role = roles.find((r) => r.id === (selectedStep.action as { roleId?: string }).roleId);
    return buildPreviewForStep(selectedStep, library, t, role);
  }, [selectedStep, library, roles, t]);

  // Only meaningful when the scenario's trigger is a modal submit — lets the
  // "input" condition editor offer real field names instead of a raw index.
  const triggerModalFields = useMemo(() => {
    if (scenario.trigger?.type !== "modal_submit") return undefined;
    return library.modals.find((m) => m.id === scenario.trigger?.componentId)?.fields;
  }, [scenario.trigger, library.modals]);

  const useTrigger = scenario.trigger != null;
  const triggerType = scenario.trigger?.type ?? "button";
  const triggerCandidates = useMemo(() => {
    if (triggerType === "button")
      return library.buttons.map((b) => ({ value: b.id, label: b.name || b.label }));
    if (triggerType === "select_menu")
      return library.selectMenus.map((s) => ({
        value: s.id,
        label: s.name || s.placeholder || t("builder.fallback.menu"),
      }));
    return library.modals.map((m) => ({
      value: m.id,
      label: m.title || t("builder.fallback.modal"),
    }));
  }, [triggerType, library, t]);

  const settingsPanel = (
    <Column gap="16" fillWidth>
      <Input
        id="scn-name"
        label={t("builder.scenarios.name")}
        value={scenario.name}
        onChange={(e) => updateMeta({ name: e.target.value })}
        maxLength={100}
        characterCount
      />
      <Textarea
        id="scn-desc"
        label={t("builder.scenarios.description")}
        value={scenario.description ?? ""}
        onChange={(e) => updateMeta({ description: e.target.value })}
        maxLength={250}
        characterCount
      />

      <Column
        gap="12"
        fillWidth
        padding="16"
        border="neutral-weak"
        radius="m"
        background="neutral-alpha-weak"
      >
        <Text variant="label-strong-s">{t("builder.scenarios.triggerHeading")}</Text>
        <Switch
          label={t("builder.scenarios.useTrigger")}
          description={t("builder.scenarios.useTriggerHint")}
          checked={useTrigger}
          onToggle={() =>
            updateMeta(
              useTrigger ? { trigger: null } : { trigger: { type: "button", componentId: "" } },
            )
          }
        />

        {useTrigger && (
          <Column gap="8" fillWidth>
            <Text variant="label-default-s">{t("builder.scenarios.triggerType")}</Text>
            <SegmentedControl
              fillWidth
              value={triggerType}
              onChange={(v) =>
                updateMeta({ trigger: { type: v as ScenarioTriggerType, componentId: "" } })
              }
              buttons={TRIGGER_OPTIONS.map((o) => ({
                label: t(TRIGGER_TYPE_OPTION_LABEL[o]),
                value: o,
              }))}
            />
            <LabelSelect
              id="trigger-component"
              label={t("builder.scenarios.triggerComponent")}
              selectedValue={scenario.trigger?.componentId ?? ""}
              setSelectedValue={(v) =>
                updateMeta({
                  trigger: { type: triggerType, componentId: (v as string) ?? "" },
                })
              }
              options={triggerCandidates}
            />
          </Column>
        )}

        <Switch
          label={t("builder.scenarios.enabled")}
          description={t("builder.scenarios.enabledHint")}
          checked={scenario.enabled}
          onToggle={() => updateMeta({ enabled: !scenario.enabled })}
        />
      </Column>

      <CommandAccordion
        title={t("builder.scenarios.restrictions")}
        subline={t("builder.scenarios.restrictionsHint")}
        iconName="security"
        open={restrictionsOpen}
        onToggle={() => setRestrictionsOpen((v) => !v)}
      >
        <Column gap="12" fillWidth>
          <RoleSelect
            id="allowed-roles"
            label={t("builder.scenarios.allowedRoles")}
            multiple
            selectedRole={scenario.allowedRoles ?? []}
            setSelectedRole={(val) => updateMeta({ allowedRoles: (val as string[]) ?? [] })}
            options={(roles ?? []).map((r) => ({
              label: <RolePill roleColor={r.color} label={r.name} />,
              value: r.id,
            }))}
          />
          <RoleSelect
            id="denied-roles"
            label={t("builder.scenarios.deniedRoles")}
            multiple
            selectedRole={scenario.deniedRoles ?? []}
            setSelectedRole={(val) => updateMeta({ deniedRoles: (val as string[]) ?? [] })}
            options={(roles ?? []).map((r) => ({
              label: <RolePill roleColor={r.color} label={r.name} />,
              value: r.id,
            }))}
          />
          <ChannelSelect
            id="allowed-channels"
            label={t("builder.scenarios.allowedChannels")}
            multiple
            selectedChannel={scenario.allowedChannels ?? []}
            setSelectedChannel={(val) => updateMeta({ allowedChannels: (val as string[]) ?? [] })}
            options={(channels ?? []).map((c) => ({
              label: (
                <ChannelPill channel={{ id: c.id, name: c.name, type: c.type } as any} size="s" />
              ),
              value: c.id,
            }))}
          />
          <NumberInput
            id="scn-cooldown"
            label={t("builder.scenarios.cooldown")}
            min={0}
            max={86400}
            step={1}
            value={scenario.cooldown ?? 0}
            onChange={(v) => updateMeta({ cooldown: Number(v) || undefined })}
          />
        </Column>
      </CommandAccordion>

      <CommandAccordion
        title={t("builder.scenarios.variables")}
        subline={t("builder.scenarios.variablesHint")}
        iconName="actionVar"
        open={variablesOpen}
        onToggle={() => setVariablesOpen((v) => !v)}
      >
        <VariablesEditor
          value={scenario.variables ?? {}}
          onChange={(v) => updateMeta({ variables: v })}
        />
      </CommandAccordion>
    </Column>
  );

  return (
    <Flex
      fillWidth
      direction="column"
      gap="16"
      wrap
      m={{ direction: "column" }}
      style={{ alignItems: "flex-start" }}
    >
      {/* Canvas — scenario settings and add-step live inside it as collapsible overlays */}
      <RevealFx delay={600} translateY={-0.5}>
        <Column
          gap="12"
          fillWidth
          padding="24"
          border="neutral-weak"
          radius="l"
          background="surface"
          minHeight={55}
          style={{ flex: "3 1 600px", minWidth: 360 }}
        >
          <Flex fill>
            <ScenarioFlow
              guildId={guildId}
              nodes={nodes}
              edges={edges}
              selectedNodeId={selectedNodeId}
              setNodes={setNodes}
              setEdges={setEdges}
              onCanvasChange={handleCanvasChange}
              onSelectNode={setSelectedNodeId}
              onRemoveStep={removeStep}
              onAddStep={addStep}
              settingsPanel={settingsPanel}
              library={library}
              roles={roles}
              channels={channels}
            />
          </Flex>
        </Column>
      </RevealFx>

      <RevealFx delay={900} translateY={-0.5}>
        <Column
          gap="12"
          fillWidth
          padding="24"
          border="neutral-weak"
          radius="l"
          background="surface"
          style={{ minWidth: 320 }}
        >
          <Text variant="label-default-s">{t("builder.scenarios.preview")}</Text>
          <Flex center>
            <DiscordPreview message={previewMessage} />
          </Flex>
          {selectedStep ? (
            <ActionNodeForm
              guildId={guildId}
              step={selectedStep}
              library={library}
              roles={roles}
              channels={channels}
              triggerModalFields={triggerModalFields}
              onUpdate={(action) => updateStepAction(selectedStep.id, action)}
              onUpdateMeta={(patch) => updateStepMeta(selectedStep.id, patch)}
            />
          ) : (
            <Flex center>
              <Text variant="body-default-s" onBackground="neutral-weak" align="center">
                {t("builder.scenarios.selectStepHint")}
              </Text>
            </Flex>
          )}
        </Column>
      </RevealFx>
    </Flex>
  );
}

function VariablesEditor({
  value,
  onChange,
}: {
  value: Record<string, string>;
  onChange: (v: Record<string, string>) => void;
}) {
  const t = useT();
  const [name, setName] = useState("");
  const [val, setVal] = useState("");
  return (
    <Column gap="8" fillWidth>
      {Object.keys(value).length === 0 && (
        <Text variant="body-default-s" onBackground="neutral-weak">
          {t("builder.scenarios.noVariables")}
        </Text>
      )}
      {Object.entries(value).map(([k, v]) => (
        <Row gap="8" fillWidth key={k} vertical="center">
          <Text variant="body-default-s" style={{ fontFamily: "monospace" }}>
            {k}
          </Text>
          <Text
            variant="body-default-s"
            onBackground="neutral-weak"
            style={{ flex: 1, wordBreak: "break-all" }}
          >
            {v}
          </Text>
          <IconButton
            icon="trash"
            variant="ghost"
            size="s"
            tooltip={t("builder.scenarios.removeVariable")}
            onClick={() => {
              const next = { ...value };
              delete next[k];
              onChange(next);
            }}
          />
        </Row>
      ))}
      <Row gap="8" fillWidth>
        <Input
          id="var-name"
          label={t("builder.scenarios.variableName")}
          placeholder="myVar"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          id="var-value"
          label={t("builder.scenarios.variableValue")}
          placeholder="{user.name}"
          value={val}
          onChange={(e) => setVal(e.target.value)}
        />
        <Button
          variant="secondary"
          onClick={() => {
            const k = name.trim();
            if (!k) return;
            onChange({ ...value, [k]: val });
            setName("");
            setVal("");
          }}
        >
          {t("builder.scenarios.addVariable")}
        </Button>
      </Row>
    </Column>
  );
}
