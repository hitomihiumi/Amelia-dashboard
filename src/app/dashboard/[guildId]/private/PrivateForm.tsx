"use client";

import React, { useState, useEffect, useMemo, useCallback, useActionState } from "react";
import {
  Flex,
  Text,
  Row,
  Column,
  useToast,
  Button,
  Input,
  Switch,
  InlineCode,
} from "@once-ui-system/core";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import { autoSetupTempVoiceSettings, updatePrivateRoomSettings } from "./actions";
import { GuildActionState } from "@/types/dashboard";

import type { GuildSchema } from "@/lib/db/types";
import { useRouter } from "next/navigation";
import { DashIcon } from "@/components/dashboard/DashIcon";
import { ChannelPickOption } from "@/lib/discord/channel-type";
import { ChannelSelect } from "@/components/dashboard/discord/ChannelSelect";
import { ChannelPill } from "@/components/dashboard/discord/ChannelPill";
import { Section } from "@/components/dashboard/Section";
import { SectionGrid } from "@/components/layout/SectionGrid";
import { useT } from "@/i18n/client";

type Form = Pick<GuildSchema["utils"], "join_to_create">;

export function PrivateForm({
  guildId,
  defaultJTC,
  voiceChannels,
  categories,
}: {
  guildId: string;
  defaultJTC: Form["join_to_create"];
  voiceChannels: ChannelPickOption[];
  categories: ChannelPickOption[];
}) {
  const t = useT();
  const router = useRouter();
  const { setIsDirty, setSaveAction, setCancelAction } = useUnsavedChanges();
  const { addToast } = useToast();

  const [joinToCreate, setJoinToCreate] = useState<Form["join_to_create"]>(defaultJTC);

  const handleVoiceChannel = (channel: string) => {
    setJoinToCreate((prev) => ({ ...prev, channel: channel }));
  };

  const handleCategory = (category: string) => {
    setJoinToCreate((prev) => ({ ...prev, category: category }));
  };

  const handleChannelName = (name: string) => {
    setJoinToCreate((prev) => ({ ...prev, default_name: name }));
  };

  const [autoState, autoAction, autoPending] = useActionState<GuildActionState, FormData>(
    autoSetupTempVoiceSettings,
    null,
  );

  useEffect(() => {
    if (autoState) {
      if (autoState.ok) {
        addToast({
          variant: "success",
          message: t("settings.private.autoSetupSuccess"),
        });
      } else {
        addToast({
          variant: "danger",
          message: autoState.error || t("settings.private.autoSetupFailed"),
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoState]);

  const [baseline, setBaseline] = useState<Form>(() => ({
    join_to_create: joinToCreate,
  }));

  const sameAsBaseline = useMemo(
    () => joinToCreate === baseline.join_to_create,
    [joinToCreate, baseline],
  );

  useEffect(() => {
    setIsDirty(!sameAsBaseline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sameAsBaseline]);

  const handleSave = useCallback(async () => {
    const fd = new FormData();
    fd.set("guildId", guildId);
    fd.set("join_to_create", JSON.stringify(joinToCreate));

    const result: GuildActionState = await updatePrivateRoomSettings(guildId, fd);
    if (!result) {
      addToast({ variant: "danger", message: t("settings.shared.noResponse") });
      return;
    }
    if (result.ok) {
      setJoinToCreate(joinToCreate);
      setBaseline({
        join_to_create: joinToCreate,
      });
      router.refresh();
      addToast({ variant: "success", message: t("settings.shared.saveSuccess") });
      return;
    }
    addToast({ variant: "danger", message: result.error ?? t("settings.shared.saveFailed") });
  }, [guildId, joinToCreate, router, addToast, t]);

  const handleCancel = useCallback(() => {
    setJoinToCreate(baseline.join_to_create);
  }, [baseline]);

  useEffect(() => {
    setSaveAction(handleSave);
    setCancelAction(handleCancel);
    return () => {
      setSaveAction(null);
      setCancelAction(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleSave, handleCancel]);

  useEffect(() => {
    return () => {
      setIsDirty(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SectionGrid>
      <Section
        title={t("settings.private.sectionTitle")}
        description={t("settings.private.sectionDescription")}
        num={1}
        switcher={
          <Switch
            checked={joinToCreate.enabled}
            onToggle={() => setJoinToCreate((prev) => ({ ...prev, enabled: !prev.enabled }))}
          />
        }
        icon="microphone"
      >
        <form action={autoAction}>
          <input type="hidden" name="guildId" value={guildId} />
          <Row
            background={"overlay"}
            border={"neutral-medium"}
            radius={"m"}
            padding={"20"}
            gap={"16"}
            vertical="start"
          >
            <DashIcon name={"plane"} />
            <Flex direction="column" gap="12" style={{ minWidth: 0, maxWidth: "60ch" }}>
              <Text variant="body-strong-m">{t("settings.private.autoSetupTitle")}</Text>
              <Text variant="body-default-xs" onBackground="neutral-medium">
                {t("settings.private.autoSetupDescription")}
              </Text>
              <Row>
                <Button prefixIcon={"plane"} type="submit" disabled={autoPending}>
                  {autoPending
                    ? t("settings.private.autoSetupPending")
                    : t("settings.private.autoSetupButton")}
                </Button>
              </Row>
            </Flex>
          </Row>
        </form>

        <Column gap="12">
          <Text variant="body-strong-s">{t("settings.private.nameTitle")}</Text>
          <Text variant="body-default-xs" onBackground="neutral-medium" style={{ maxWidth: "72ch" }}>
            {t("settings.private.nameDescription")}
          </Text>
          <Input
            id={"default-name"}
            value={joinToCreate.default_name}
            onChange={(e) => handleChannelName(e.target.value)}
            placeholder={t("settings.private.namePlaceholder")}
            description={
              <Row vertical="center" gap="4" wrap>
                {t("settings.private.nameHintBefore")} <InlineCode>{"%{VAR}%"}</InlineCode>
                {t("settings.private.nameHintAfter")}
              </Row>
            }
          />
        </Column>
      </Section>

      <Section
        title={t("settings.private.channelsTitle")}
        description={t("settings.private.channelsDescription")}
        num={2}
        icon="gear"
      >
        <Column gap="12">
          <Text variant="body-strong-s">{t("settings.private.triggerTitle")}</Text>
          <Text variant="body-default-xs" onBackground="neutral-medium" style={{ maxWidth: "72ch" }}>
            {t("settings.private.triggerDescription")}
          </Text>
          <ChannelSelect
            label={t("settings.private.triggerLabel")}
            selectedChannel={joinToCreate.channel || ""}
            setSelectedChannel={handleVoiceChannel}
            options={voiceChannels.map((channel) => ({
              label: <ChannelPill channel={channel} />,
              value: channel.id,
            }))}
            id={"trigger-channel"}
          />
        </Column>
        <Column gap="12">
          <Text variant="body-strong-s">{t("settings.private.categoryTitle")}</Text>
          <Text variant="body-default-xs" onBackground="neutral-medium" style={{ maxWidth: "72ch" }}>
            {t("settings.private.categoryDescription")}
          </Text>
          <ChannelSelect
            label={t("settings.private.categoryLabel")}
            selectedChannel={joinToCreate.category || ""}
            setSelectedChannel={handleCategory}
            options={categories.map((channel) => ({
              label: <ChannelPill channel={channel} />,
              value: channel.id,
            }))}
            id={"category-channel"}
          />
        </Column>
      </Section>
    </SectionGrid>
  );
}
