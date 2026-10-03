"use client";

import { DashIcon } from "@/components/dashboard/DashIcon";
import { ConfirmIconButton } from "@/components/dashboard/ConfirmIconButton";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import { useT } from "@/i18n/client";
import type { Translator } from "@/i18n/translate";
import { generateID } from "@/lib/db/generateID";
import type { ScenarioCustom, ScenarioTriggerType } from "@/lib/db/types";
import type { GuildChannelOption } from "@/lib/discord/channels-api";
import type { DiscordRole } from "@/lib/discord/role-style";
import type { GuildActionState } from "@/types/dashboard";
import { Button, Feedback, Flex, IconButton, RevealFx, Tag, Text, useToast } from "@once-ui-system/core";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createScenarioAction, deleteScenarioAction, updateScenarios } from "./actions";
import styles from "./ScenariosManager.module.scss";
import { TRIGGER_TYPE_LABEL } from "./scenarioGraph";
import type { ComponentsLibrary } from "./scenariosTypes";

export interface ScenariosManagerProps {
  guildId: string;
  initialLibrary: ComponentsLibrary;
  roles: DiscordRole[];
  channels: GuildChannelOption[];
}

/** Mirrors SCENARIO_LIMITS.MAX_SCENARIOS_PER_GUILD, enforced again server-side. */
const MAX_SCENARIOS = 10;

export function ScenariosManager({
  guildId,
  initialLibrary,
  roles,
  channels,
}: ScenariosManagerProps) {
  // roles/channels are not used by the manager itself; reserved for future inline filter UI.
  void roles;
  void channels;
  const t = useT();
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
      addToast({ variant: "success", message: t("builder.scenarios.saved") });
    } else {
      addToast({ variant: "danger", message: result?.error ?? t("builder.scenarios.saveFailed") });
    }
  }, [guildId, scenarios, router, addToast, t]);

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
    if (scenarios.length >= MAX_SCENARIOS) {
      addToast({
        variant: "danger",
        message: t("builder.scenarios.limitReached", { max: MAX_SCENARIOS }),
      });
      return;
    }
    setCreating(true);
    try {
      const res = await createScenarioAction(guildId);
      if (res.ok) {
        router.refresh();
        router.push(`/dashboard/${guildId}/scenarios/${res.scenarioId}`);
      } else {
        addToast({ variant: "danger", message: res.error ?? t("builder.scenarios.createFailed") });
      }
    } finally {
      setCreating(false);
    }
  }, [guildId, scenarios.length, router, addToast, t]);

  const duplicateScenario = useCallback(
    (id: string) => {
      const orig = scenarios.find((s) => s.id === id);
      if (!orig) return;
      const copy: ScenarioCustom = JSON.parse(JSON.stringify(orig));
      copy.id = generateID(guildId, "scenario");
      copy.name = t("builder.shared.copyName", { name: orig.name });
      copy.steps = copy.steps.map((s) => ({ ...s, id: generateID(guildId, "step") }));
      setScenarios((prev) => [...prev, copy]);
    },
    [scenarios, guildId, t],
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
        addToast({ variant: "danger", message: res?.error ?? t("builder.scenarios.deleteFailed") });
      }
    },
    [guildId, router, addToast, t],
  );

  return (
    <Flex direction="column" gap="16" fillWidth>
      <RevealFx delay={300} translateY={-0.5} fillWidth>
        <div className={styles.toolbar}>
          <span className={styles.toolbarTitle}>
            <DashIcon name="gitnet" />
            <Text variant="heading-strong-s">{t("builder.scenarios.title")}</Text>
            <Text variant="body-default-s" onBackground="neutral-weak">
              {scenarios.length}/{MAX_SCENARIOS}
            </Text>
          </span>
          <Button
            prefixIcon="plus"
            onClick={createScenario}
            disabled={creating || scenarios.length >= MAX_SCENARIOS}
          >
            {t("builder.scenarios.newScenario")}
          </Button>
        </div>
      </RevealFx>

      {scenarios.length === 0 ? (
        <RevealFx delay={600} translateY={-0.5} fillWidth>
          <Feedback
            variant="info"
            title={t("builder.scenarios.emptyTitle")}
            description={t("builder.scenarios.emptyText")}
          />
        </RevealFx>
      ) : (
        <div className={styles.grid}>
          {scenarios.map((scenario, idx) => (
            <RevealFx delay={400 + idx * 100} translateY={-0.5} key={scenario.id} fillWidth>
              <ScenarioCard
                scenario={scenario}
                guildId={guildId}
                onDuplicate={() => duplicateScenario(scenario.id)}
                onDelete={() => deleteScenario(scenario.id)}
              />
            </RevealFx>
          ))}
        </div>
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
  const t = useT();
  const triggerMissing = scenario.trigger == null;
  return (
    <Link href={`/dashboard/${guildId}/scenarios/${scenario.id}`} className={styles.card}>
      <div className={styles.cardHead}>
        <Text variant="body-strong-m" className={styles.cardTitle}>
          {scenario.name || t("builder.scenarios.untitled")}
        </Text>
        <div className={styles.cardActions}>
          <IconButton
            icon="copy"
            variant="secondary"
            size="m"
            tooltip={t("builder.shared.duplicate")}
            onClick={(e: any) => {
              e?.stopPropagation();
              e?.preventDefault();
              onDuplicate();
            }}
          />
          <IconButton
            icon="trash"
            variant="danger"
            size="m"
            tooltip={t("common.actions.delete")}
            onClick={(e: any) => {
              e?.stopPropagation();
              e?.preventDefault();
              onDelete();
            }}
          />
        </div>
      </div>
      {scenario.description && (
        <Text variant="body-default-s" onBackground="neutral-weak" style={{ maxWidth: "100%" }}>
          {scenario.description}
        </Text>
      )}
      <div className={styles.cardTags}>
        {triggerMissing ? (
          <Tag label={t("builder.scenarios.noTrigger")} scheme="warning" />
        ) : (
          <Tag label={triggerTypeLabel(scenario.trigger!.type, t)} scheme="accent" />
        )}
        <Tag label={t("builder.scenarios.stepsCount", { count: scenario.steps.length })} scheme="brand" />
        {(scenario.cooldown ?? 0) > 0 && (
          <Tag
            label={t("builder.scenarios.cooldownTag", { seconds: scenario.cooldown ?? 0 })}
            scheme="neutral"
          />
        )}
        {(scenario.allowedRoles?.length ?? 0) > 0 && (
          <Tag
            label={t("builder.scenarios.rolesTag", { count: scenario.allowedRoles!.length })}
            scheme="neutral"
          />
        )}
        <Tag
          label={scenario.enabled ? t("common.state.enabled") : t("common.state.disabled")}
          scheme={scenario.enabled ? "success" : "danger"}
        />
      </div>
    </Link>
  );
}

function triggerTypeLabel(type: ScenarioTriggerType | string, t: Translator): string {
  return type in TRIGGER_TYPE_LABEL ? t(TRIGGER_TYPE_LABEL[type as ScenarioTriggerType]) : type;
}
