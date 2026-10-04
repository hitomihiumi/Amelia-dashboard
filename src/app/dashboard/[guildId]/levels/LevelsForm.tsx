"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Flex,
  Text,
  Input,
  Column,
  Row,
  Grid,
  Switch,
  IconButton,
  Button,
  useToast,
  Line,
  NumberInput,
  RevealFx,
} from "@once-ui-system/core";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import { updateLevelsSettings } from "./actions";
import { ChannelSelect } from "@/components/dashboard/discord/ChannelSelect";
import { RoleSelect } from "@/components/dashboard/discord/RoleSelect";
import { useRouter } from "next/navigation";
import type { GuildSchema } from "@/lib/db/types";
import { ChannelPickOption } from "@/lib/discord/channel-type";
import { DiscordRole } from "@/lib/discord/role-style";
import { RolePill } from "@/components/dashboard/discord/RolePill";
import { ChannelPill } from "@/components/dashboard/discord/ChannelPill";
import { GuildActionState } from "@/types/dashboard";
import { DashIcon } from "@/components/dashboard/DashIcon";
import { Section } from "@/components/dashboard/Section";
import { SectionGrid } from "@/components/layout/SectionGrid";
import { useT } from "@/i18n/client";

/** Form fields sharing a row while each keeps ~220px; `fill` keeps a lone field from stretching. */
function Fields({ children, fill = false }: { children: React.ReactNode; fill?: boolean }) {
  return (
    <Grid
      fillWidth
      gap="12"
      style={{
        gridTemplateColumns: `repeat(auto-${fill ? "fill" : "fit"}, minmax(min(100%, 220px), 1fr))`,
        alignItems: fill ? undefined : "start",
      }}
    >
      {children}
    </Grid>
  );
}

export function LevelsForm({
  guildId,
  defaultLevels,
  defaultEconomy,
  textChannels,
  voiceChannels,
  roles,
}: {
  guildId: string;
  defaultLevels: GuildSchema["utils"]["levels"];
  defaultEconomy: GuildSchema["economy"]["income"]["level_up"];
  textChannels: ChannelPickOption[];
  voiceChannels: ChannelPickOption[];
  roles: DiscordRole[];
}) {
  const t = useT();
  const router = useRouter();
  const { addToast } = useToast();
  const { setIsDirty, setSaveAction, setCancelAction } = useUnsavedChanges();

  const [levels, setLevels] = useState(defaultLevels);
  const [economy, setEconomy] = useState(defaultEconomy);
  const [baseline, setBaseline] = useState({ levels: defaultLevels, economy: defaultEconomy });

  const [newLevel, setNewLevel] = useState<number>(1);
  const [newRoleId, setNewRoleId] = useState<string>("");

  const isDirty = useMemo(
    () =>
      JSON.stringify(levels) !== JSON.stringify(baseline.levels) ||
      JSON.stringify(economy) !== JSON.stringify(baseline.economy),
    [levels, economy, baseline],
  );

  useEffect(() => {
    setIsDirty(isDirty);
  }, [isDirty, setIsDirty]);

  const handleSave = useCallback(async () => {
    const fd = new FormData();
    fd.set("levels", JSON.stringify(levels));
    fd.set("economy", JSON.stringify(economy));

    const result: GuildActionState = await updateLevelsSettings(guildId, fd);
    if (!result) {
      addToast({ variant: "danger", message: t("settings.shared.noResponse") });
      return;
    }
    if (result.ok) {
      setBaseline({ levels, economy });
      addToast({ message: t("settings.levels.saved"), variant: "success" });
      router.refresh();
    } else {
      addToast({ message: result.error || t("settings.levels.saveFailed"), variant: "danger" });
    }
  }, [guildId, levels, economy, router, addToast, t]);

  const handleCancel = useCallback(() => {
    setLevels(baseline.levels);
    setEconomy(baseline.economy);
  }, [baseline]);

  useEffect(() => {
    setSaveAction(handleSave);
    setCancelAction(handleCancel);
    return () => {
      setSaveAction(null);
      setCancelAction(null);
    };
  }, [handleSave, handleCancel, setSaveAction, setCancelAction]);

  const addRoleReward = () => {
    if (isNaN(newLevel) || newLevel <= 0 || !newRoleId) return;

    setLevels((prev) => ({
      ...prev,
      level_roles: { ...prev.level_roles, [newLevel]: newRoleId },
    }));
    setNewLevel(1);
    setNewRoleId("");
  };

  const removeRoleReward = (lvl: string) => {
    const updatedRoles = { ...levels.level_roles };
    delete updatedRoles[parseInt(lvl)];
    setLevels((prev) => ({ ...prev, level_roles: updatedRoles }));
  };

  const roleOptions = useMemo(
    () =>
      roles.map((r) => ({
        label: <RolePill roleColor={r.color} label={r.name} />,
        value: r.id,
      })),
    [roles],
  );

  const channelOptions = useMemo(
    () =>
      textChannels.map((c) => ({
        label: <ChannelPill channel={c} />,
        value: c.id,
      })),
    [textChannels],
  );

  const allChannelOptions = useMemo(
    () =>
      [...textChannels, ...voiceChannels].map((channel) => ({
        label: <ChannelPill channel={channel} />,
        value: channel.id,
      })),
    [textChannels, voiceChannels],
  );

  return (
    <SectionGrid>
      <SectionGrid.Full>
        <RevealFx translateY={-0.5} fillWidth>
          <Flex
            direction="column"
            padding="20"
            border="neutral-medium"
            radius="l"
            background="surface"
            fillWidth
          >
            <Row horizontal="between" vertical="center" gap="16">
              <Row vertical="center" gap="16" style={{ minWidth: 0 }}>
                <DashIcon name={"ribbon"} />
                <Column gap="4">
                  <Text variant="body-strong-l">{t("settings.levels.enableTitle")}</Text>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    {t("settings.levels.enableDescription")}
                  </Text>
                </Column>
              </Row>
              <Switch
                checked={levels.enabled}
                onToggle={() => setLevels((p) => ({ ...p, enabled: !p.enabled }))}
              />
            </Row>
          </Flex>
        </RevealFx>
      </SectionGrid.Full>

      <Section
        title={t("settings.levels.rewardsTitle")}
        description={t("settings.levels.rewardsDescription")}
        num={2}
        icon="trophy"
      >
        {Object.entries(levels.level_roles).length === 0 ? (
          <Row fillWidth center padding="s">
            <Text variant="body-default-s" onBackground="neutral-weak">
              {t("settings.levels.rewardsEmpty")}
            </Text>
          </Row>
        ) : (
          <Grid
            fillWidth
            gap="8"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 230px), 1fr))" }}
          >
            {Object.entries(levels.level_roles)
              .sort(([a], [b]) => parseInt(a) - parseInt(b))
              .map(([lvl, rId]) => {
                const role = roles.find((r) => r.id === rId);
                return (
                  <Row
                    key={lvl}
                    horizontal="between"
                    vertical="center"
                    gap="8"
                    style={{ minWidth: 0 }}
                    padding="12"
                    background="overlay"
                    radius="m"
                    border="neutral-alpha-medium"
                  >
                    <Row vertical="center" gap="12" style={{ minWidth: 0 }}>
                      <Text
                        variant="body-strong-m"
                        style={{ flex: "0 0 auto", minWidth: 40, whiteSpace: "nowrap" }}
                      >
                        {t("settings.levels.levelShort", { level: lvl })}
                      </Text>
                      <RolePill
                        roleColor={role?.color || 0}
                        label={role?.name || t("common.select.unknownRole")}
                      />
                    </Row>
                    <IconButton
                      icon="close"
                      variant="tertiary"
                      size="s"
                      onClick={() => removeRoleReward(lvl)}
                    />
                  </Row>
                );
              })}
          </Grid>
        )}

        <Line />

        <Row wrap vertical="end" gap="12">
          <Row
            style={{ flex: "1 1 100px", maxWidth: 160, minWidth: 0 }}
            s={{ style: { maxWidth: "none" } }}
          >
            <NumberInput
              id="new-reward-level"
              value={newLevel}
              onChange={(value) => setNewLevel(value)}
              placeholder="5"
              label={t("settings.levels.levelLabel")}
            />
          </Row>
          <Row style={{ flex: "3 1 200px", minWidth: 0 }}>
            <RoleSelect
              fillWidth
              id="new-reward-role"
              options={roleOptions}
              selectedRole={newRoleId}
              setSelectedRole={(val) => setNewRoleId(val as string)}
              label={t("settings.levels.roleToGrant")}
            />
          </Row>
          <Button
            style={{ flex: "0 0 auto" }}
            variant="primary"
            onClick={addRoleReward}
            disabled={!newLevel || !newRoleId}
          >
            {t("common.actions.add")}
          </Button>
        </Row>
      </Section>

      <Section
        title={t("settings.levels.announcementsTitle")}
        description={t("settings.levels.announcementsDescription")}
        num={3}
        icon="send"
        switcher={
          <Switch
            checked={levels.message.enabled}
            onToggle={() =>
              setLevels((p) => ({
                ...p,
                message: { ...p.message, enabled: !p.message.enabled },
              }))
            }
          />
        }
      >
        <Fields>
          <ChannelSelect
            label={t("settings.levels.announcementChannel")}
            id="level-up-channel"
            options={channelOptions}
            selectedChannel={levels.message.channel || ""}
            setSelectedChannel={(val) =>
              setLevels((p) => ({
                ...p,
                message: { ...p.message, channel: (val as string) || null },
              }))
            }
          />
          <NumberInput
            id="msg-delete-delay"
            label={t("settings.levels.deleteDelay")}
            value={levels.message.delete}
            onChange={(value) =>
              setLevels((p) => ({
                ...p,
                message: { ...p.message, delete: Number(value) },
              }))
            }
          />
        </Fields>
      </Section>

      <Section
        title={t("settings.levels.restrictionsTitle")}
        description={t("settings.levels.restrictionsDescription")}
        num={4}
        icon="eyeoff"
      >
        <Fields>
          <ChannelSelect
            label={t("settings.levels.ignoredChannels")}
            id="ignored-channels"
            multiple
            options={allChannelOptions}
            selectedChannel={levels.ignore_channels}
            setSelectedChannel={(val) =>
              setLevels((p) => ({ ...p, ignore_channels: val as string[] }))
            }
          />
          <RoleSelect
            label={t("settings.levels.ignoredRoles")}
            id="ignored-roles"
            multiple
            options={roleOptions}
            selectedRole={levels.ignore_roles}
            setSelectedRole={(val) => setLevels((p) => ({ ...p, ignore_roles: val as string[] }))}
          />
        </Fields>
      </Section>

      <Section
        title={t("settings.levels.cashTitle")}
        description={t("settings.levels.cashDescription")}
        num={5}
        icon={"money"}
        switcher={
          <Switch
            checked={economy.enabled}
            onToggle={() => setEconomy((p) => ({ ...p, enabled: !p.enabled }))}
          />
        }
      >
        <Fields fill>
          <NumberInput
            id="eco-reward-amount"
            label={t("settings.levels.rewardAmount")}
            value={economy.amount}
            onChange={(value) => setEconomy((p) => ({ ...p, amount: Number(value) }))}
          />
        </Fields>
      </Section>
    </SectionGrid>
  );
}
