'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Flex, Text, useToast, Column, Line, Row, Select } from '@once-ui-system/core';
import { useUnsavedChanges } from '@/contexts/UnsavedChangesContext';
import { updateCommandPermissions } from './actions';
import { RoleSelect } from "@/components/dashboard/discord/RoleSelect";
import { RolePill } from "@/components/dashboard/discord/RolePill";
import { CommandAccordion } from "@/components/dashboard/CommandAccordion";
import { defaultPermissions, permissionType } from "@/lib/discord/role-style";
import { useRouter } from 'next/navigation';
import type { CommandPermission, GuildSchema } from "@/lib/db/types";
import { DiscordRole } from "@/lib/discord/role-style";
import { IconName } from "@/resources/icons";

type Form = GuildSchema["permissions"]['commands'];

const commandList: { name: string; label: string; description: string; icon: IconName; defaultPermission: bigint | null }[] = [
  {
    name: "bot",
    label: "Bot Information",
    description: "Access to bot status, latency, and invite link.",
    icon: "gitnet",
    defaultPermission: null
  },
  {
    name: "custom",
    label: "Constructor",
    description: "Commands for creation custom buttons and etc.",
    icon: "palette",
    defaultPermission: permissionType.Administrator
  },
  {
    name: "eco",
    label: "Economy",
    description: "Use economy commands like balance, daily rewards, and leaderboards.",
    icon: "money",
    defaultPermission: null
  },
  {
    name: "setting",
    label: "Settings Control",
    description: "Manage bot prefix, language, and core behavior.",
    icon: "gear",
    defaultPermission: permissionType.Administrator
  },
  {
    name: "user",
    label: "User Customization",
    description: "Commands for profile customization and view profile.",
    icon: "user",
    defaultPermission: null
  },
  {
    name: "util",
    label: "Utils",
    description: "Utility commands like backup.",
    icon: "command",
    defaultPermission: permissionType.Administrator
  },
  {
    name: "rp",
    label: "Role Play",
    description: "Command for roleplay interactions.",
    icon: "bonfire",
    defaultPermission: null
  }
];

const normalizePermission = (cmd: CommandPermission | undefined, name: string, defaultPerm: bigint | null): CommandPermission => {
  return {
    name: name,
    permission: cmd?.permission !== undefined ? (cmd.permission === null ? null : BigInt(cmd.permission)) : defaultPerm,
    roles: cmd?.roles || [],
  };
};

export function CommandsFrom({
                               guildId,
                               permissions,
                               guildRoles,
                             }: { guildId: string; permissions: Form; guildRoles: DiscordRole[] }) {
  const router = useRouter();
  const { addToast } = useToast();
  const { setIsDirty, setSaveAction, setCancelAction } = useUnsavedChanges();

  const initialData = useMemo(() => {
    const data: Form = {};
    commandList.forEach(cmd => {
      data[cmd.name] = normalizePermission(permissions[cmd.name], cmd.name, cmd.defaultPermission);
    });
    return data;
  }, [permissions]);

  const [perms, setPerms] = useState<Form>(initialData);
  const [baseline, setBaseline] = useState<Form>(initialData);

  const isDirty = useMemo(() => JSON.stringify(perms, (k, v) => typeof v === 'bigint' ? v.toString() : v) !==
          JSON.stringify(baseline, (k, v) => typeof v === 'bigint' ? v.toString() : v),
      [perms, baseline]);

  useEffect(() => { setIsDirty(isDirty); }, [isDirty, setIsDirty]);

  const handleSave = useCallback(async () => {
    const fd = new FormData();

    const serialized = JSON.stringify(perms, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    );

    fd.set('permissions', serialized);

    const result = await updateCommandPermissions(guildId, fd);
    if (!result) {
      addToast({ variant: "danger", message: "No response from server" });
      return;
    }
    if (result.ok) {
      setBaseline(perms);
      addToast({ message: "Permissions updated successfully", variant: "success" });
      router.refresh();
    } else {
      addToast({ message: result.error || "Update failed", variant: "danger" });
    }
  }, [guildId, perms, router, addToast]);

  const handleCancel = useCallback(() => setPerms(baseline), [baseline]);

  useEffect(() => {
    setSaveAction(handleSave);
    setCancelAction(handleCancel);
    return () => { setSaveAction(null); setCancelAction(null); };
  }, [handleSave, handleCancel, setSaveAction, setCancelAction]);

  const updateCmd = (name: string, patch: Partial<CommandPermission>) => {
    setPerms(prev => ({
      ...prev,
      [name]: { ...prev[name], ...patch }
    }));
  };

  const roleOptions = useMemo(() => guildRoles.map(r => ({
    label: <RolePill roleColor={r.color} label={r.name} />,
    value: r.id
  })), [guildRoles]);

  const permissionOptions = useMemo(() => [
    { label: "None (Default)", value: "null" },
    ...defaultPermissions.map(p => ({
      label: p.name,
      value: p.bigint.toString()
    }))
  ], []);

  const renderCommandSettings = (name: string, label: string, description: string, icon: IconName) => {
    const cmd = perms[name];
    const allowedIds = cmd.roles.filter(r => r.type === 'allow').map(r => r.id);
    const deniedIds = cmd.roles.filter(r => r.type === 'deny').map(r => r.id);

    return (
        <CommandAccordion
            key={name}
            iconName={icon}
            title={<Row center gap={'16'}><Text variant="body-strong-m">{label}</Text><Text variant="body-default-s" onBackground={'brand-weak'}>/{name}</Text></Row>}
            subline={description}
        >
          <Column gap="16" paddingBottom="12">
            <Column gap="8">
              <Select
                  label={'Required Discord Permission'}
                  id={`${name}-perm`}
                  options={permissionOptions}
                  value={cmd.permission?.toString() || "null"}
                  onSelect={(val) => updateCmd(name, { permission: val === "null" ? null : BigInt(val) })}
              />
            </Column>

            <Line />

            <Column gap="8">
              <RoleSelect
                  label={'Whitelisted Roles (Always Allowed)'}
                  id={`${name}-allow`}
                  multiple
                  options={roleOptions}
                  selectedRole={allowedIds}
                  setSelectedRole={(ids) => {
                    const others = cmd.roles.filter(r => r.type !== 'allow');
                    const updated = [...others, ...(ids as string[]).map(id => ({ id, type: 'allow' as const }))];
                    updateCmd(name, { roles: updated });
                  }}
              />
            </Column>

            <Column gap="8">
              <RoleSelect
                  label={'Blacklisted Roles (Always Denied)'}
                  id={`${name}-deny`}
                  multiple
                  options={roleOptions}
                  selectedRole={deniedIds}
                  setSelectedRole={(ids) => {
                    const others = cmd.roles.filter(r => r.type !== 'deny');
                    const updated = [...others, ...(ids as string[]).map(id => ({ id, type: 'deny' as const }))];
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
          {commandList.map((cmd) => renderCommandSettings(cmd.name, cmd.label, cmd.description, cmd.icon))}
        </Column>
      </Flex>
  );
}