"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Flex, Text, Input, Select, useToast } from "@once-ui-system/core";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import { updateGeneralSettings } from "./actions";

import type { GuildSchema } from "@/lib/db/types";
import { useRouter } from "next/navigation";
import { GuildActionState } from "@/types/dashboard";

type Form = Pick<GuildSchema["settings"], "prefix" | "language">;

export function GeneralForm({
  guildId,
  defaultPrefix,
  defaultLanguage,
}: { guildId: string; defaultPrefix: string; defaultLanguage: string }) {
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
      addToast({ variant: "danger", message: "No response from server" });
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
      addToast({ variant: "success", message: "Successfully updated settings" });
      return;
    }
    addToast({ variant: "danger", message: result.error ?? "Cannot save settings" });
  }, [guildId, prefix, language, router]);

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
    <Flex direction="column" gap="24">
      <Flex direction="column" gap="8">
        <Text variant="heading-strong-l">General settings</Text>
        <Text variant="body-default-m" onBackground="neutral-medium">
          Configure the basic settings of your bot, such as command prefix and interface language.
        </Text>
      </Flex>

      <Flex
        direction="column"
        gap="16"
        padding="24"
        border="neutral-weak"
        radius="l"
        background="surface"
      >
        <Flex direction="column" gap="8">
          <Text variant="body-strong-l">Command prefix</Text>
          <Text variant="body-default-s" onBackground="neutral-medium">
            Set the prefix that users will use to invoke bot commands. This will not affect to slash
            commands.
          </Text>
        </Flex>

        <Input
          id="prefix"
          value={prefix}
          onChange={(e) => setPrefix(e.target.value)}
          placeholder="a., !, etc."
          maxLength={5}
        />
      </Flex>

      <Flex
        direction="column"
        gap="16"
        padding="24"
        border="neutral-weak"
        radius="l"
        background="surface"
      >
        <Flex direction="column" gap="8">
          <Text variant="body-strong-l">Interface language</Text>
          <Text variant="body-default-s" onBackground="neutral-medium">
            Choose the language for bot responses and interface.
          </Text>
        </Flex>

        <Select
          id="language"
          value={language}
          options={[
            { label: "English", value: "en" },
            { label: "Ukrainian", value: "uk" },
            { label: "Russian", value: "ru" },
          ]}
          label="Choose a language"
          onSelect={(value) => setLanguage(value)}
          maxLength={5}
        />
      </Flex>
    </Flex>
  );
}
