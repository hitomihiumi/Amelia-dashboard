"use client";

import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import type { ScenarioCustom } from "@/lib/db/types";
import type { GuildChannelOption } from "@/lib/discord/channels-api";
import type { DiscordRole } from "@/lib/discord/role-style";
import type { GuildActionState } from "@/types/dashboard";
import { useToast } from "@once-ui-system/core";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScenarioEditor } from "../ScenarioEditor";
import type { ComponentsLibrary } from "../scenariosTypes";
import { updateScenarioAction } from "./actions";

export interface ScenarioEditorPageProps {
  guildId: string;
  initialScenario: ScenarioCustom;
  library: ComponentsLibrary;
  roles: DiscordRole[];
  channels: GuildChannelOption[];
}

export function ScenarioEditorPage({
  guildId,
  initialScenario,
  library,
  roles,
  channels,
}: ScenarioEditorPageProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const { setIsDirty, setSaveAction, setCancelAction } = useUnsavedChanges();

  const [scenario, setScenario] = useState<ScenarioCustom>(initialScenario);
  const [baseline, setBaseline] = useState<ScenarioCustom>(initialScenario);

  // Reseed state when navigating to a different scenario id.
  useEffect(() => {
    setScenario(initialScenario);
    setBaseline(initialScenario);
  }, [initialScenario.id]);

  const sameAsBaseline = useMemo(
    () => JSON.stringify(scenario) === JSON.stringify(baseline),
    [scenario, baseline],
  );

  useEffect(() => {
    setIsDirty(!sameAsBaseline);
  }, [sameAsBaseline, setIsDirty]);

  const handleSave = useCallback(async () => {
    const result: GuildActionState = await updateScenarioAction(guildId, scenario);
    if (result?.ok) {
      setBaseline(scenario);
      router.refresh();
      addToast({ variant: "success", message: "Scenario saved" });
    } else {
      addToast({ variant: "danger", message: result?.error ?? "Failed to save scenario" });
    }
  }, [guildId, scenario, router, addToast]);

  const handleCancel = useCallback(() => {
    setScenario(baseline);
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

  return (
    <ScenarioEditor
      guildId={guildId}
      scenario={scenario}
      library={library}
      roles={roles}
      channels={channels}
      onChange={setScenario}
    />
  );
}
