"use client";

import { DashIcon } from "@/components/dashboard/DashIcon";
import { ConfirmIconButton } from "@/components/dashboard/ConfirmIconButton";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import { generateID } from "@/lib/db/generateID";
import type { ScenarioCustom } from "@/lib/db/types";
import type { GuildChannelOption } from "@/lib/discord/channels-api";
import type { DiscordRole } from "@/lib/discord/role-style";
import type { GuildActionState } from "@/types/dashboard";
import {
  Button,
  Card,
  Feedback,
  Flex,
  Grid,
  IconButton,
  Row,
  Tag,
  Text,
  useToast,
} from "@once-ui-system/core";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createScenarioAction, deleteScenarioAction, updateScenarios } from "./actions";
import type { ComponentsLibrary } from "./scenariosTypes";

export interface ScenariosManagerProps {
  guildId: string;
  initialLibrary: ComponentsLibrary;
  roles: DiscordRole[];
  channels: GuildChannelOption[];
}

const TRIGGER_TYPE_LABEL: Record<string, string> = {
  button: "Button click",
  select_menu: "Select menu",
  modal_submit: "Modal submit",
};

export function ScenariosManager({
  guildId,
  initialLibrary,
  roles,
  channels,
}: ScenariosManagerProps) {
  // roles/channels are not used by the manager itself; reserved for future inline filter UI.
  void roles;
  void channels;
  const router = useRouter();
  const { addToast } = useToast();
  const { setIsDirty, setSaveAction, setCancelAction } = useUnsavedChanges();

  const [scenarios, setScenarios] = useState<ScenarioCustom[]>(initialLibrary.scenarios ?? []);
  const [baseline, setBaseline] = useState<ScenarioCustom[]>(initialLibrary.scenarios ?? []);
  const [creating, setCreating] = useState(false);

  const sameAsBaseline = useMemo(
    () => JSON.stringify(scenarios) === JSON.stringify(baseline),
    [scenarios, baseline],
  );

  useEffect(() => {
    setIsDirty(!sameAsBaseline);
  }, [sameAsBaseline, setIsDirty]);

  const handleSave = useCallback(async () => {
    const fd = new FormData();
    fd.set("scenarios", JSON.stringify(scenarios));
    const result: GuildActionState = await updateScenarios(guildId, fd);
    if (result?.ok) {
      setBaseline(scenarios);
      router.refresh();
      addToast({ variant: "success", message: "Scenarios saved" });
    } else {
      addToast({ variant: "danger", message: result?.error ?? "Failed to save scenarios" });
    }
  }, [guildId, scenarios, router, addToast]);

  const handleCancel = useCallback(() => {
    setScenarios(baseline);
  }, [baseline]);

  useEffect(() => {
    setSaveAction(handleSave);
    setCancelAction(handleCancel);
    return () => {
      setSaveAction(null);
      setCancelAction(null);
    };
  }, [handleSave, handleCancel, setSaveAction, setCancelAction]);

  useEffect(() => {
    return () => setIsDirty(false);
  }, [setIsDirty]);

  const createScenario = useCallback(async () => {
    if (scenarios.length >= 10) {
      addToast({ variant: "danger", message: "Scenario limit reached (10)." });
      return;
    }
    setCreating(true);
    try {
      const res = await createScenarioAction(guildId);
      if (res.ok) {
        router.refresh();
        router.push(`/dashboard/${guildId}/scenarios/${res.scenarioId}`);
      } else {
        addToast({ variant: "danger", message: res.error ?? "Failed to create scenario" });
      }
    } finally {
      setCreating(false);
    }
  }, [guildId, scenarios.length, router, addToast]);

  const duplicateScenario = useCallback(
    (id: string) => {
      const orig = scenarios.find((s) => s.id === id);
      if (!orig) return;
      const copy: ScenarioCustom = JSON.parse(JSON.stringify(orig));
      copy.id = generateID(guildId, "scenario");
      copy.name = `${orig.name} copy`;
      copy.steps = copy.steps.map((s) => ({ ...s, id: generateID(guildId, "step") }));
      setScenarios((prev) => [...prev, copy]);
    },
    [scenarios, guildId],
  );

  const deleteScenario = useCallback(
    async (id: string) => {
      // Persist immediately so navigation never sees a dangling slug.
      const res: GuildActionState = await deleteScenarioAction(guildId, id);
      if (res?.ok) {
        setScenarios((prev) => prev.filter((s) => s.id !== id));
        setBaseline((prev) => prev.filter((s) => s.id !== id));
        router.refresh();
      } else {
        addToast({ variant: "danger", message: res?.error ?? "Failed to delete scenario" });
      }
    },
    [guildId, router, addToast],
  );

  return (
    <Flex direction="column" gap="16" fillWidth>
      <Row fillWidth horizontal="between" vertical="center">
        <Row gap="12" center>
          <DashIcon name="gitnet" />
          <Text variant="heading-strong-s">Scenarios</Text>
          <Text variant="body-default-s" onBackground="neutral-weak">
            {scenarios.length}/10
          </Text>
        </Row>
        <Button
          prefixIcon="plus"
          onClick={createScenario}
          disabled={creating || scenarios.length >= 10}
        >
          New scenario
        </Button>
      </Row>

      {scenarios.length === 0 ? (
        <Feedback
          variant="info"
          title="No scenarios"
          description="Create your first scenario to wire a custom component to multi-step bot behaviour."
        />
      ) : (
        <Grid columns={3} m={{ columns: 2 }} s={{ columns: 1 }} gap="m" fill>
          {scenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              guildId={guildId}
              onDuplicate={() => duplicateScenario(scenario.id)}
              onDelete={() => deleteScenario(scenario.id)}
            />
          ))}
        </Grid>
      )}
    </Flex>
  );
}

function ScenarioCard({
  scenario,
  guildId,
  onDuplicate,
  onDelete,
}: {
  scenario: ScenarioCustom;
  guildId: string;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const triggerMissing = scenario.trigger == null;
  return (
    <Card
      direction="column"
      gap="16"
      padding="16"
      border="neutral-medium"
      radius="m"
      background="surface"
      style={{ cursor: "pointer" }}
      tabIndex={0}
      href={`/dashboard/${guildId}/scenarios/${scenario.id}`}
      fill
    >
      <Row fillWidth horizontal="between" vertical="start" gap="8">
        <Text variant="body-strong-s" style={{ wordBreak: "break-word" }}>
          {scenario.name || "Untitled"}
        </Text>
        <Row gap="4" style={{ flexShrink: 0 }}>
          <IconButton
            icon="copy"
            variant="ghost"
            size="s"
            tooltip="Duplicate"
            onClick={(e: any) => {
              e?.stopPropagation();
              e?.preventDefault();
              onDuplicate();
            }}
          />
          <ConfirmIconButton
            variant="confirm"
            tooltip="Delete"
            confirmMessage={`Delete "${scenario.name || "Untitled"}"?`}
            onConfirm={onDelete}
          />
        </Row>
      </Row>
      {scenario.description && (
        <Text variant="body-default-s" onBackground="neutral-weak" style={{ maxWidth: "100%" }}>
          {scenario.description}
        </Text>
      )}
      <Row gap="8" wrap>
        {triggerMissing ? (
          <Tag label="No trigger" variant="warning" />
        ) : (
          <Tag
            label={TRIGGER_TYPE_LABEL[scenario.trigger!.type] ?? scenario.trigger!.type}
            variant="accent"
          />
        )}
        <Tag label={`${scenario.steps.length} step(s)`} variant="brand" />
        {(scenario.cooldown ?? 0) > 0 && (
          <Tag label={`cooldown ${scenario.cooldown}s`} variant="neutral" />
        )}
        {(scenario.allowedRoles?.length ?? 0) > 0 && (
          <Tag label={`roles ${scenario.allowedRoles!.length}`} variant="neutral" />
        )}
        <Tag
          label={scenario.enabled ? "enabled" : "disabled"}
          variant={scenario.enabled ? "success" : "danger"}
        />
      </Row>
    </Card>
  );
}
