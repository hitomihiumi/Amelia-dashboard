"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Flex, Text, useToast, Column, Line, Row, Select, RevealFx } from "@once-ui-system/core";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import { updateCommandPermissions } from "./actions";
import { RoleSelect } from "@/components/dashboard/discord/RoleSelect";
import { RolePill } from "@/components/dashboard/discord/RolePill";
import { CommandAccordion } from "@/components/dashboard/CommandAccordion";
import { defaultPermissions, permissionType } from "@/lib/discord/role-style";
import { useRouter } from "next/navigation";
import type { CommandPermission, GuildSchema } from "@/lib/db/types";
import { DiscordRole } from "@/lib/discord/role-style";
import { IconName } from "@/resources/icons";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";

type Form = GuildSchema["permissions"]["commands"];

const commandList: {
  name: string;
  label: MessageKey;
  description: MessageKey;
  icon: IconName;
  defaultPermission: bigint | null;
}[] = [
  {
    name: "bot",
    label: "settings.commands.items.bot.label",
    description: "settings.commands.items.bot.description",
    icon: "gitnet",
    defaultPermission: null,
  },
  {
    name: "custom",
    label: "settings.commands.items.custom.label",
    description: "settings.commands.items.custom.description",
    icon: "palette",
    defaultPermission: permissionType.Administrator,
  },
  {
    name: "eco",
    label: "settings.commands.items.eco.label",
    description: "settings.commands.items.eco.description",
    icon: "money",
    defaultPermission: null,
  },
  {
    name: "mod",
    label: "settings.commands.items.mod.label",
    description: "settings.commands.items.mod.description",
    icon: "shield",
    defaultPermission: permissionType.ModerateMembers,
  },
  {
    name: "setting",
    label: "settings.commands.items.setting.label",
    description: "settings.commands.items.setting.description",
    icon: "gear",
    defaultPermission: permissionType.Administrator,
  },
  {
    name: "user",
    label: "settings.commands.items.user.label",
    description: "settings.commands.items.user.description",
    icon: "user",
    defaultPermission: null,
  },
  {
    name: "util",
    label: "settings.commands.items.util.label",
    description: "settings.commands.items.util.description",
    icon: "command",
    defaultPermission: permissionType.Administrator,
  },
  {
    name: "rp",
    label: "settings.commands.items.rp.label",
    description: "settings.commands.items.rp.description",
    icon: "bonfire",
    defaultPermission: null,
  },
];

const permissionLabelKeys: Record<string, MessageKey> = {
  [permissionType.Administrator.toString()]: "settings.commands.permissions.administrator",
  [permissionType.ManageGuild.toString()]: "settings.commands.permissions.manageGuild",
  [permissionType.ManageRoles.toString()]: "settings.commands.permissions.manageRoles",
  [permissionType.ManageChannels.toString()]: "settings.commands.permissions.manageChannels",
  [permissionType.KickMembers.toString()]: "settings.commands.permissions.kickMembers",
  [permissionType.BanMembers.toString()]: "settings.commands.permissions.banMembers",
  [permissionType.ManageMessages.toString()]: "settings.commands.permissions.manageMessages",
  [permissionType.ModerateMembers.toString()]: "settings.commands.permissions.moderateMembers",
};

const normalizePermission = (
  cmd: CommandPermission | undefined,
  name: string,
  defaultPerm: bigint | null,
): CommandPermission => {
  return {
    name: name,
    permission:
      cmd?.permission !== undefined
        ? cmd.permission === null
          ? null
          : BigInt(cmd.permission)
        : defaultPerm,
    roles: cmd?.roles || [],
  };
};

export function CommandsFrom({
  guildId,
  permissions,
  guildRoles,
}: { guildId: string; permissions: Form; guildRoles: DiscordRole[] }) {
  const t = useT();
  const router = useRouter();
  const { addToast } = useToast();
  const { setIsDirty, setSaveAction, setCancelAction } = useUnsavedChanges();

  const initialData = useMemo(() => {
    const data: Form = {};
    commandList.forEach((cmd) => {
      data[cmd.name] = normalizePermission(permissions[cmd.name], cmd.name, cmd.defaultPermission);
    });
    return data;
  }, [permissions]);

  const [perms, setPerms] = useState<Form>(initialData);
  const [baseline, setBaseline] = useState<Form>(initialData);

  const isDirty = useMemo(
    () =>
      JSON.stringify(perms, (k, v) => (typeof v === "bigint" ? v.toString() : v)) !==
      JSON.stringify(baseline, (k, v) => (typeof v === "bigint" ? v.toString() : v)),
    [perms, baseline],
  );

  useEffect(() => {
    setIsDirty(isDirty);
  }, [isDirty, setIsDirty]);

  const handleSave = useCallback(async () => {
    const fd = new FormData();

    const serialized = JSON.stringify(perms, (key, value) =>
      typeof value === "bigint" ? value.toString() : value,
    );

    fd.set("permissions", serialized);

    const result = await updateCommandPermissions(guildId, fd);
    if (!result) {
      addToast({ variant: "danger", message: t("settings.shared.noResponse") });
      return;
    }
    if (result.ok) {
      setBaseline(perms);
      addToast({ message: t("settings.commands.saved"), variant: "success" });
      router.refresh();
    } else {
      addToast({ message: result.error || t("settings.commands.saveFailed"), variant: "danger" });
    }
  }, [guildId, perms, router, addToast, t]);

  const handleCancel = useCallback(() => setPerms(baseline), [baseline]);

  useEffect(() => {
    setSaveAction(handleSave);
    setCancelAction(handleCancel);
    return () => {
      setSaveAction(null);
      setCancelAction(null);
    };
  }, [handleSave, handleCancel, setSaveAction, setCancelAction]);

  const updateCmd = (name: string, patch: Partial<CommandPermission>) => {
    setPerms((prev) => ({
      ...prev,
      [name]: { ...prev[name], ...patch },
    }));
  };

  const roleOptions = useMemo(
    () =>
      guildRoles.map((r) => ({
        label: <RolePill roleColor={r.color} label={r.name} />,
        value: r.id,
      })),
    [guildRoles],
  );

  const permissionOptions = useMemo(
    () => [
      { label: t("settings.commands.defaultNone"), value: "null" },
      ...defaultPermissions.map((p) => {
        const key = permissionLabelKeys[p.bigint.toString()];
        return {
          label: key ? t(key) : p.name,
          value: p.bigint.toString(),
        };
      }),
    ],
    [t],
  );

  const renderCommandSettings = (
    name: string,
    label: string,
    description: string,
    icon: IconName,
  ) => {
    const cmd = perms[name];
    const allowedIds = cmd.roles.filter((r) => r.type === "allow").map((r) => r.id);
    const deniedIds = cmd.roles.filter((r) => r.type === "deny").map((r) => r.id);

    return (
      <CommandAccordion
        key={name}
        iconName={icon}
        title={
          <Row center gap={"16"}>
            <Text variant="body-strong-m">{label}</Text>
            <Text variant="body-default-s" onBackground={"brand-weak"}>
              /{name}
            </Text>
          </Row>
        }
        subline={description}
        fillWidth
      >
        <Column gap="16" paddingBottom="12">
          <Column gap="8">
            <Select
              label={t("settings.commands.requiredPermission")}
              id={`${name}-perm`}
              options={permissionOptions}
              value={cmd.permission?.toString() || "null"}
              onSelect={(val) =>
                updateCmd(name, { permission: val === "null" ? null : BigInt(String(val)) })
              }
            />
          </Column>

          <Line />

          <Column gap="8">
            <RoleSelect
              label={t("settings.commands.whitelist")}
              id={`${name}-allow`}
              multiple
              options={roleOptions}
              selectedRole={allowedIds}
              setSelectedRole={(ids) => {
                const others = cmd.roles.filter((r) => r.type !== "allow");
                const updated = [
                  ...others,
                  ...(ids as string[]).map((id) => ({ id, type: "allow" as const })),
                ];
                updateCmd(name, { roles: updated });
              }}
            />
          </Column>

          <Column gap="8">
            <RoleSelect
              label={t("settings.commands.blacklist")}
              id={`${name}-deny`}
              multiple
              options={roleOptions}
              selectedRole={deniedIds}
              setSelectedRole={(ids) => {
                const others = cmd.roles.filter((r) => r.type !== "deny");
                const updated = [
                  ...others,
                  ...(ids as string[]).map((id) => ({ id, type: "deny" as const })),
                ];
                updateCmd(name, { roles: updated });
              }}
            />
          </Column>
        </Column>
      </CommandAccordion>
    );
  };

  return (
    <Flex direction="column" gap="24">
      <Column gap="12">
        {commandList.map((cmd, idx) => (
          <RevealFx key={cmd.name} delay={100 * idx} translateY={-0.5}>
            {renderCommandSettings(cmd.name, t(cmd.label), t(cmd.description), cmd.icon)}
          </RevealFx>
        ))}
      </Column>
    </Flex>
  );
}
