"use client";

import React, {useState, useEffect, useMemo, useCallback, useActionState} from "react";
import {
  Flex,
  Text,
  Row,
  Column,
  useToast, Button, Input, Switch,
} from "@once-ui-system/core";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import {autoSetupTempVoiceSettings, updatePrivateRoomSettings} from "./actions";
import { GuildActionState } from "@/types/dashboard";

import type { GuildSchema } from "@/lib/db/types";
import { useRouter } from "next/navigation";
import {DashIcon} from "@/components/dashboard/DashIcon";
import {ChannelPickOption} from "@/lib/discord/channel-type";
import {ChannelSelect} from "@/components/dashboard/discord/ChannelSelect";
import {ChannelPill} from "@/components/dashboard/discord/ChannelPill";

type Form = Pick<GuildSchema["utils"], "join_to_create">;

export function PrivateForm({
  guildId,
  defaultJTC,
    voiceChannels,
    categories
}: { guildId: string; defaultJTC: Form["join_to_create"], voiceChannels: ChannelPickOption[], categories: ChannelPickOption[] }) {
  const router = useRouter();
  const { setIsDirty, setSaveAction, setCancelAction } = useUnsavedChanges();
  const { addToast } = useToast();

  const [joinToCreate, setJoinToCreate] = useState<Form["join_to_create"]>(defaultJTC);

  const handleVoiceChannel = (channel: string) => {
    setJoinToCreate(prev => ({ ...prev, channel: channel }));
  }

  const handleCategory = (category: string) => {
    setJoinToCreate(prev => ({ ...prev, category: category }));
  }

  const handleChannelName = (name: string) => {
    setJoinToCreate(prev => ({ ...prev, default_name: name }));
  }

  const [autoState, autoAction, autoPending] = useActionState<
      GuildActionState,
      FormData
  >(autoSetupTempVoiceSettings, null);

  useEffect(() => {
    if (autoState) {
      if (autoState.ok) {
        addToast({ variant: "success", message: "Auto-setup successful! Changes might take a moment to appear." });
      } else {
        addToast({ variant: "danger", message: autoState.error || "Auto-setup failed." });
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
      addToast({ variant: "danger", message: "No response from server" });
      return;
    }
    if (result.ok) {
      setJoinToCreate(joinToCreate);
      setBaseline({
        join_to_create: joinToCreate,
      });
      router.refresh();
      addToast({ variant: "success", message: "Successfully updated settings" });
      return;
    }
    addToast({ variant: "danger", message: result.error ?? "Cannot save settings" });
  }, [guildId, joinToCreate, router]);

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
      <Flex
          direction="column"
          gap="24"
          padding="24"
          border="neutral-weak"
          radius="l"
          background="surface"
      >
        <Row horizontal={'between'} gap="24">
          <Flex gap="16">
            <DashIcon
                name={'microphone'}
            />
            <Column gap="8">
              <Text variant="body-strong-l">Private rooms</Text>
              <Text variant="body-default-s" onBackground="neutral-medium">
                Users will be able to create temporary voice channels by joining a designated "Join to Create" channel.
              </Text>
            </Column>
          </Flex>
          <Switch
              isChecked={joinToCreate.enabled}
              onToggle={() =>
                  setJoinToCreate((prev) => ({ ...prev, enabled: !prev.enabled }))
              }
          />
        </Row>
        <form action={autoAction}>
          <input type="hidden" name="guildId" value={guildId} />
          <Column
              background={"overlay"}
              border={"neutral-medium"}
              radius={"m"}
              padding={"20"}
              gap={"12"}
          >
            <Row gap={'12'}>
              <DashIcon
                  name={'plane'}
              />
              <Flex direction="column" gap="12">
                <Text variant="body-strong-m">Auto-setup</Text>
                <Text variant="body-default-xs" onBackground="neutral-medium">
                  Automatically create a "Join to Create" voice channel, category and the necessary permissions for it.
                </Text>
                <Button prefixIcon={'plane'} type="submit" disabled={autoPending}>
                  {autoPending ? "Setting up..." : "Auto-setup"}
                </Button>
              </Flex>
            </Row>
          </Column>
        </form>
        <Column gap="16">
          <Text variant="body-strong-s">CHANNEL TRIGGER</Text>
          <Text variant="body-default-xs" onBackground="neutral-medium">
            Select the voice channel that users will join to create their private rooms.
          </Text>
          <ChannelSelect
              label={"Select trigger channel"}
              selectedChannel={joinToCreate.channel}
              setSelectedChannel={handleVoiceChannel}
              options={voiceChannels.map((channel) => ({
                label: <ChannelPill channel={channel}/>,
                value: channel.id,
              }))}
              id={'trigger-channel'}
          />
        </Column>
        <Column gap="16">
          <Text variant="body-strong-s">CATEGORY FOR NEW ROOMS</Text>
          <Text variant="body-default-xs" onBackground="neutral-medium">
            Select the category where the new private rooms will be created.
          </Text>
          <ChannelSelect
              label={"Select category"}
              selectedChannel={joinToCreate.category}
              setSelectedChannel={handleCategory}
              options={categories.map((channel) => ({
                label: <ChannelPill channel={channel}/>,
                value: channel.id,
              }))}
              id={'trigger-channel'}
          />
        </Column>
        <Column gap="16">
          <Text variant="body-strong-s">DEFAULT NAME</Text>
          <Text variant="body-default-xs" onBackground="neutral-medium">
            Set the default name for the private rooms. Users will be able to change it after the room is created.
          </Text>
          <Input
              id={'default-name'}
              value={joinToCreate.default_name}
              onChange={(e) => handleChannelName(e.target.value)}
              placeholder="Private Room"
          />
        </Column>
      </Flex>
  );
}
