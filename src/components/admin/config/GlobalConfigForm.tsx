"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Grid, Row, useToast } from "@once-ui-system/core";
import { useRouter } from "next/navigation";
import type { ServiceOverride } from "@/lib/admin/defaults";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import { useT } from "@/i18n/client";
import { updateGlobalConfig } from "@/app/admin/actions";
import { SectionIndex, type IndexEntry } from "./ConfigSection";
import { BannerSection, LandingSection, LinksSection, StatusSection } from "./sections";
import {
  LINK_FIELDS,
  dirtySections,
  linkState,
  normalize,
  toFormState,
  type ConfigValues,
  type FormState,
} from "./form";
import styles from "./Config.module.scss";

type SaveResult = { ok: true } | { ok: false; error: string };

interface GlobalConfigFormProps {
  config: ConfigValues;
  overrides: Record<string, ServiceOverride>;
  /** Replaces the server action; used by the visual test bench only. */
  save?: (formData: FormData) => Promise<SaveResult>;
}

/**
 * The site settings page. Dirty state, save and cancel are handed to the admin layout's
 * unsaved-changes bar instead of rendering a save button of its own.
 */
export function GlobalConfigForm({ config, overrides, save = updateGlobalConfig }: GlobalConfigFormProps) {
  const t = useT();
  const router = useRouter();
  const { addToast } = useToast();
  const { setIsDirty, setSaveAction, setCancelAction } = useUnsavedChanges();

  const [baseline, setBaseline] = useState<FormState>(() => toFormState(config, overrides));
  const [state, setState] = useState<FormState>(baseline);

  const update = useCallback(
    (patch: Partial<FormState>) => setState((previous) => ({ ...previous, ...patch })),
    [],
  );

  const dirty = useMemo(() => dirtySections(state, baseline), [state, baseline]);
  const isDirty = dirty.size > 0;

  useEffect(() => {
    setIsDirty(isDirty);
  }, [isDirty, setIsDirty]);

  const handleSave = useCallback(async () => {
    const next = normalize(state);

    // The server checks the links again; catching it here saves a round trip.
    if (LINK_FIELDS.some((field) => linkState(next[field]) === "invalid")) {
      addToast({ message: t("admin.config.links.invalidToast"), variant: "danger" });
      document.getElementById("links")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const formData = new FormData();
    formData.set("config", JSON.stringify(next));

    const result = await save(formData);

    if (result.ok) {
      setState(next);
      setBaseline(next);
      router.refresh();
      addToast({ message: t("admin.config.saved"), variant: "success" });
    } else {
      addToast({ message: result.error, variant: "danger" });
    }
  }, [state, save, router, addToast, t]);

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

  const entries = useMemo<IndexEntry[]>(
    () => [
      { id: "banner", icon: "megaphone", label: t("admin.config.banner.title") },
      { id: "links", icon: "link", label: t("admin.config.links.title") },
      { id: "landing", icon: "home", label: t("admin.config.landing.title") },
      { id: "status", icon: "radialGauge", label: t("admin.config.status.title") },
    ],
    [t],
  );

  return (
    <Row vertical="start" gap="24" paddingBottom={7}>
      <Grid fillWidth className={styles.sections}>
        <BannerSection state={state} update={update} />
        <LinksSection state={state} update={update} />
        <LandingSection state={state} update={update} />
        <StatusSection state={state} update={update} />
      </Grid>
      <SectionIndex entries={entries} dirty={dirty} />
    </Row>
  );
}
