"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Column, Feedback, Grid, Input, Text, useToast } from "@once-ui-system/core";
import { useRouter } from "next/navigation";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import { Section } from "@/components/dashboard/Section";
import { SectionGrid } from "@/components/layout/SectionGrid";
import {
  AI_CAP_BOUNDS,
  AI_MODEL_KEYS,
  AI_QUOTA_BOUNDS,
  type AiGlobalConfig,
  type AiLimits,
  type AiModelKey,
  type AiModelQuota,
} from "@/lib/db/types";
import { useT } from "@/i18n/client";
import { updateAiGlobalConfig } from "./actions";

const QUOTA_FIELDS = Object.keys(AI_QUOTA_BOUNDS) as (keyof AiModelQuota)[];
const CAP_FIELDS = Object.keys(AI_CAP_BOUNDS) as (keyof AiLimits)[];

const outOfRange = (value: number, min: number, max: number) =>
  !Number.isInteger(value) || value < min || value > max;

/**
 * Quota of the API key per model and ceilings for the servers' own limits. Dirty state, save and
 * cancel go through the admin layout's unsaved-changes bar, like the site settings page.
 */
export function AiLimitsForm({ config }: { config: AiGlobalConfig }) {
  const t = useT();
  const router = useRouter();
  const { addToast } = useToast();
  const { setIsDirty, setSaveAction, setCancelAction } = useUnsavedChanges();

  const [state, setState] = useState(config);
  const [baseline, setBaseline] = useState(config);

  const isDirty = useMemo(
    () => JSON.stringify(state) !== JSON.stringify(baseline),
    [state, baseline],
  );

  useEffect(() => {
    setIsDirty(isDirty);
  }, [isDirty, setIsDirty]);

  const invalid = useMemo(
    () =>
      AI_MODEL_KEYS.some((model) =>
        QUOTA_FIELDS.some((field) =>
          outOfRange(
            state.quota[model][field],
            AI_QUOTA_BOUNDS[field].min,
            AI_QUOTA_BOUNDS[field].max,
          ),
        ),
      ) ||
      CAP_FIELDS.some((field) =>
        outOfRange(state.caps[field], AI_CAP_BOUNDS[field].min, AI_CAP_BOUNDS[field].max),
      ),
    [state],
  );

  const handleSave = useCallback(async () => {
    if (invalid) {
      addToast({ message: t("adminAi.errors.invalidToast"), variant: "danger" });
      return;
    }

    const formData = new FormData();
    formData.set("config", JSON.stringify(state));

    const result = await updateAiGlobalConfig(formData);

    if (result.ok) {
      setBaseline(state);
      router.refresh();
      addToast({ message: t("adminAi.saved"), variant: "success" });
    } else {
      addToast({ message: result.error, variant: "danger" });
    }
  }, [state, invalid, router, addToast, t]);

  const handleCancel = useCallback(() => setState(baseline), [baseline]);

  useEffect(() => {
    setSaveAction(handleSave);
    setCancelAction(handleCancel);
    return () => {
      setSaveAction(null);
      setCancelAction(null);
    };
  }, [handleSave, handleCancel, setSaveAction, setCancelAction]);

  // Leaving the page must not leave the bar behind.
  useEffect(() => () => setIsDirty(false), [setIsDirty]);

  const setQuota = (model: AiModelKey, field: keyof AiModelQuota, raw: string) => {
    const value = Number.parseInt(raw, 10);
    setState((prev) => ({
      ...prev,
      quota: {
        ...prev.quota,
        [model]: { ...prev.quota[model], [field]: Number.isNaN(value) ? 0 : value },
      },
    }));
  };

  const setCap = (field: keyof AiLimits, raw: string) => {
    const value = Number.parseInt(raw, 10);
    setState((prev) => ({
      ...prev,
      caps: { ...prev.caps, [field]: Number.isNaN(value) ? 0 : value },
    }));
  };

  return (
    <SectionGrid>
      <Section
        title={t("adminAi.quota.title")}
        description={t("adminAi.quota.description")}
        span="full"
        num={1}
        icon="navAi"
      >
        <Grid
          fillWidth
          gap="24"
          minWidth={0}
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
            alignItems: "start",
          }}
        >
          {AI_MODEL_KEYS.map((model) => (
            <Column key={model} gap="16" minWidth={0}>
              <Text variant="heading-strong-s">{t(`adminAi.models.${model}`)}</Text>
              {QUOTA_FIELDS.map((field) => {
                const { min, max } = AI_QUOTA_BOUNDS[field];
                const bad = outOfRange(state.quota[model][field], min, max);
                return (
                  <Input
                    key={field}
                    id={`ai-quota-${model}-${field}`}
                    type="number"
                    label={t(`adminAi.quota.${field}`)}
                    value={String(state.quota[model][field])}
                    min={min}
                    max={max}
                    error={bad}
                    errorMessage={bad ? t("adminAi.range", { min, max }) : undefined}
                    onChange={(e) => setQuota(model, field, e.target.value)}
                  />
                );
              })}
            </Column>
          ))}
        </Grid>
        <Feedback
          variant="info"
          title={t("adminAi.quota.noteTitle")}
          description={t("adminAi.quota.note")}
        />
      </Section>

      <Section
        title={t("adminAi.caps.title")}
        description={t("adminAi.caps.description")}
        span="full"
        num={2}
        icon="navAi"
      >
        <Grid
          fillWidth
          gap="16"
          minWidth={0}
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
            alignItems: "start",
          }}
        >
          {CAP_FIELDS.map((field) => {
            const { min, max } = AI_CAP_BOUNDS[field];
            const bad = outOfRange(state.caps[field], min, max);
            return (
              <Input
                key={field}
                id={`ai-cap-${field}`}
                type="number"
                label={t(`adminAi.caps.${field}`)}
                value={String(state.caps[field])}
                min={min}
                max={max}
                error={bad}
                errorMessage={bad ? t("adminAi.range", { min, max }) : undefined}
                onChange={(e) => setCap(field, e.target.value)}
              />
            );
          })}
        </Grid>
      </Section>
    </SectionGrid>
  );
}
