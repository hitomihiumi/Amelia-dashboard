"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Flex, Text, useToast, Button, Grid, Row, Column } from "@once-ui-system/core";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";

import type { CommandPermission, GuildSchema } from "@/lib/db/types";
import { useRouter } from "next/navigation";
import { DiscordRole } from "@/lib/discord/role-style";
import { GuildActionState } from "@/types/dashboard";
import { CommandAccordion } from "@/components/dashboard/CommandAccordion";
import { RoleSelect } from "@/components/dashboard/discord/RoleSelect";
import { RolePill } from "@/components/dashboard/discord/RolePill";

type Form = GuildSchema["permissions"];

const normalizePermission = (cmd: CommandPermission | undefined, name: string) => {
  if (!cmd) {
    return {
      name: name,
      permission: null,
      roles: [],
    };
  }

  if (cmd.permission === undefined) cmd.permission = null;
  if (!cmd.roles) cmd.roles = [];

  return cmd;
};

export function CommandsFrom({
  guildId,
  permissions,
  guildRoles,
}: { guildId: string; permissions: Form; guildRoles: DiscordRole[] }) {
  const router = useRouter();
  const { setIsDirty, setSaveAction, setCancelAction } = useUnsavedChanges();
  const { addToast } = useToast();

  const [perms, setPerms] = useState<Form>(permissions);

  const [baseline, setBaseline] = useState<Form>(() => ({
    commands: perms.commands,
  }));

  const sameAsBaseline = useMemo(
    () => JSON.stringify(perms.commands) === JSON.stringify(baseline.commands),
    [perms, baseline],
  );

  const handleRestrict = (cmd: string, roles: string[]) => {
    setPerms((prev) => {
      const normalizedData = normalizePermission(prev.commands[cmd], cmd);
      const nextCommands = {
        ...prev.commands,
        [cmd]: { ...normalizedData, roles: normalizedData.roles.filter((r) => r.type === "allow") },
      };
      roles.forEach((r) => {
        nextCommands[cmd].roles.push({ id: r, type: "deny" });
      });
      return { ...prev, commands: nextCommands };
    });
  };

  const handleUnrestrict = (cmd: string, roles: string[]) => {
    setPerms((prev) => {
      const normalizedData = normalizePermission(prev.commands[cmd], cmd);
      const nextCommands = {
        ...prev.commands,
        [cmd]: { ...normalizedData, roles: normalizedData.roles.filter((r) => r.type === "deny") },
      };
      roles.forEach((r) => {
        nextCommands[cmd].roles.push({ id: r, type: "allow" });
      });
      return { ...prev, commands: nextCommands };
    });
  };

  useEffect(() => {
    setIsDirty(!sameAsBaseline);
  }, [sameAsBaseline, setIsDirty]);

  const handleSave = useCallback(async () => {
    const fd = new FormData();
    fd.set("guildId", guildId);
    fd.set("perms", JSON.stringify(perms));

    //const result: GuildActionState = await updateShop(guildId, fd);
    //if (!result) {
    //    addToast({ variant: "danger", message: "No response from server" });
    //    return;
    //}
    //if (result.ok) {
    //    setBaseline({
    //        commands: perms.commands,
    //    });
    //    router.refresh();
    //    addToast({ variant: "success", message: "Successfully updated shop" });
    //    return;
    //}
    //addToast({ variant: "danger", message: result.error ?? "Cannot save settings" });
  }, [guildId, perms, router]);

  const handleCancel = useCallback(() => {
    setPerms({ commands: baseline.commands });
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
    <Column>
      <CommandAccordion
        title={
          <Row gap={"12"}>
            <Text variant="body-strong-s" onBackground={"brand-weak"}>
              /setting
            </Text>
            <Text variant="body-strong-s">Category sub-commands for bot settings</Text>
          </Row>
        }
        subline={"Server"}
      >
        <Column gap="12">
          <RoleSelect
            label={"Restrict access"}
            selectedRole={
              perms.commands["setting"]?.roles
                ? perms.commands["setting"].roles.filter((r) => r.type === "deny").map((r) => r.id)
                : []
            }
            setSelectedRole={(role) =>
              handleRestrict("setting", Array.isArray(role) ? role : [role])
            }
            options={guildRoles.map((role) => ({
              label: <RolePill roleColor={role.color} label={role.name} />,
              value: role.id,
            }))}
            id={"guildId"}
            max={25}
          />
          <RoleSelect
            label={"Unrestrict access"}
            selectedRole={
              perms.commands["setting"]?.roles
                ? perms.commands["setting"].roles.filter((r) => r.type === "allow").map((r) => r.id)
                : []
            }
            setSelectedRole={(role) =>
              handleUnrestrict("setting", Array.isArray(role) ? role : [role])
            }
            options={guildRoles.map((role) => ({
              label: <RolePill roleColor={role.color} label={role.name} />,
              value: role.id,
            }))}
            id={"guildId"}
            max={25}
          />
        </Column>
      </CommandAccordion>
    </Column>
  );
}
