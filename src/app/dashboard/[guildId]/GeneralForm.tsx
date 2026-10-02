"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Flex, Text, Input, Select, useToast, RevealFx } from "@once-ui-system/core";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import { updateGeneralSettings } from "./actions";

import type { GuildSchema } from "@/lib/db/types";
import { useRouter } from "next/navigation";
import { GuildActionState } from "@/types/dashboard";
import { DashIcon } from "@/components/dashboard/DashIcon";
import { Section } from "@/components/dashboard/Section";
import { useT } from "@/i18n/client";
import { LOCALES, LOCALE_META } from "@/i18n/config";

// Language names stay in their own language, whatever the dashboard language is.
const BOT_LANGUAGES = LOCALES.map((code) => ({
  label: `${LOCALE_META[code].flag} ${LOCALE_META[code].nativeName}`,
  value: code,
}));

type Form = Pick<GuildSchema["settings"], "prefix" | "language">;

export function GeneralForm({
  guildId,
  defaultPrefix,
  defaultLanguage,
}: { guildId: string; defaultPrefix: string; defaultLanguage: string }) {
  const t = useT();
  const router = useRouter();
  const { setIsDirty, setSaveAction, setCancelAction } = useUnsavedChanges();
  const { addToast } = useToast();

  const [prefix, setPrefix] = useState(defaultPrefix);
  const [language, setLanguage] = useState<Form["language"]>(defaultLanguage);

  const [baseline, setBaseline] = useState<Form>(() => ({
    prefix: defaultPrefix,
    language: defaultLanguage,
  }));

  const sameAsBaseline = useMemo(
    () => prefix === baseline.prefix && language === baseline.language,
    [prefix, language, baseline],
  );

  useEffect(() => {
    setIsDirty(!sameAsBaseline);
  }, [sameAsBaseline, setIsDirty]);

  const handleSave = useCallback(async () => {
    const fd = new FormData();
    fd.set("guildId", guildId);
    fd.set("prefix", prefix.trim());
    fd.set("language", language);

    const result: GuildActionState = await updateGeneralSettings(guildId, fd);
    if (!result) {
      addToast({ variant: "danger", message: t("settings.shared.noResponse") });
      return;
    }
    if (result.ok) {
      const trimmed = prefix.trim();
      const next: Form = {
        prefix: trimmed,
        language,
      };
      setPrefix(trimmed);
      setLanguage(language);
      setBaseline(next);
      router.refresh();
      addToast({ variant: "success", message: t("settings.shared.saveSuccess") });
      return;
    }
    addToast({ variant: "danger", message: result.error ?? t("settings.shared.saveFailed") });
  }, [guildId, prefix, language, router, addToast, t]);

  const handleCancel = useCallback(() => {
    setPrefix(baseline.prefix);
    setLanguage(baseline.language);
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
    return () => {
      setIsDirty(false);
    };
  }, [setIsDirty]);

  return (
    <>
      <Section
        title={t("settings.general.prefixTitle")}
        description={t("settings.general.prefixDescription")}
        icon="ticket"
        num={1}
      >
        <Input
          id="prefix"
          value={prefix}
          onChange={(e) => setPrefix(e.target.value)}
          placeholder={t("settings.general.prefixPlaceholder")}
          maxLength={5}
        />
      </Section>

      <Section
        title={t("settings.general.languageTitle")}
        description={t("settings.general.languageDescription")}
        icon="sign"
        num={2}
      >
        <Select
          id="language"
          value={language}
          options={BOT_LANGUAGES}
          label={t("settings.general.languageLabel")}
          onSelect={(value) => setLanguage(String(value))}
          maxLength={5}
        />
      </Section>
    </>
  );
}
