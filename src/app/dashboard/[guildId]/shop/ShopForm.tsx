"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Flex,
  Text,
  useToast,
  Button,
  Grid,
} from "@once-ui-system/core";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";

import type { GuildSchema, ShopRole } from "@/lib/db/types";
import { useRouter } from "next/navigation";

import { ShopModal } from "@/components/dashboard/ShopModal";
import { DiscordRole } from "@/lib/discord/role-style";
import { updateShop } from "@/app/dashboard/[guildId]/shop/actions";
import { GuildActionState } from "@/types/dashboard";
import { RoleCard } from "@/components/dashboard/RoleCard";

type Form = GuildSchema["economy"]["shop"];

export function ShopFrom({
  guildId,
  defaultShop,
  guildRoles,
}: { guildId: string; defaultShop: Form; guildRoles: DiscordRole[] }) {
  const router = useRouter();
  const { setIsDirty, setSaveAction, setCancelAction } = useUnsavedChanges();
  const { addToast } = useToast();

  const [roles, setRoles] = useState<ShopRole[]>(defaultShop?.roles || []);

  const [newRole, setNewRole] = useState<ShopRole>({
    role: "",
    price: 100,
    discount: {
      amount: 0,
      starts_at: null,
      expires_at: null,
    },
  });

  const handleRoleChange = (newRole: string) => {
    setNewRole((prev) => ({ ...prev, role: newRole }));
  };

  const [baseline, setBaseline] = useState<Form>(() => ({
    roles: defaultShop.roles,
  }));

  const sameAsBaseline = useMemo(
    () => JSON.stringify(roles) === JSON.stringify(baseline.roles),
    [roles, baseline],
  );

  const [openModal, setOpenModal] = useState<boolean>(false);

  useEffect(() => {
    setIsDirty(!sameAsBaseline);
  }, [sameAsBaseline, setIsDirty]);

  const handleSave = useCallback(async () => {
    const fd = new FormData();
    fd.set("guildId", guildId);
    fd.set("roles", JSON.stringify(roles));

    const result: GuildActionState = await updateShop(guildId, fd);
    if (!result) {
      addToast({ variant: "danger", message: "No response from server" });
      return;
    }
    if (result.ok) {
      setBaseline({
        roles,
      });
      router.refresh();
      addToast({ variant: "success", message: "Successfully updated shop" });
      return;
    }
    addToast({ variant: "danger", message: result.error ?? "Cannot save settings" });
  }, [guildId, roles, router]);

  const handleCancel = useCallback(() => {
    setRoles(baseline.roles);
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

  const filtredRoles = useMemo(() => {
    return guildRoles.filter((gr) => !roles.some((r) => r.role === gr.id));
  }, [roles, guildRoles]);

  return (
    <Flex direction="column" gap="24">
      <Flex direction="column" gap="8">
        <Text variant="heading-strong-l">Roles shop</Text>
        <Text variant="body-default-m" onBackground="neutral-medium">
          Configure the roles that users can buy in the shop. You can set the price and the role for
          each item.
        </Text>
      </Flex>

      <Flex
        direction="row"
        gap="16"
        padding="24"
        border="neutral-weak"
        radius="l"
        background="surface"
        horizontal={"between"}
        vertical={"center"}
      >
        <Text variant="body-strong-l">Add role to shop</Text>
        <Button
          prefixIcon={"plus"}
          onClick={() => {
            setNewRole({
              role: "",
              price: 100,
              discount: {
                amount: 0,
                starts_at: null,
                expires_at: null,
              },
            });
            setOpenModal(true);
          }}
        >
          Add role
        </Button>
      </Flex>

      {roles.length > 0 && (
        <Grid columns={3} m={{ columns: 2 }} s={{ columns: 1 }} gap="m" fillWidth>
          {roles.map((item, id) => {
            const discordRole = guildRoles.find((r) => r.id === item.role) as DiscordRole;
            return (
              <RoleCard
                key={id}
                setRoles={setRoles}
                setOpenModal={setOpenModal}
                setNewRole={setNewRole}
                role={item}
                discordRole={discordRole}
              />
            );
          })}
        </Grid>
      )}

      <ShopModal
        open={openModal}
        setOpen={setOpenModal}
        role={newRole.role}
        setRole={handleRoleChange}
        roles={filtredRoles}
        shopRole={newRole}
        setShopRole={setNewRole}
        onConfirm={() => {
          setRoles((prev) => {
            const existingId = prev.findIndex((r) => r.role === newRole.role);
            if (existingId >= 0) {
              const newRoles = [...prev];
              newRoles[existingId] = newRole;
              return newRoles;
            }
            return [...prev, newRole];
          });
          setOpenModal(false);
          setNewRole({
            role: "",
            price: 100,
            discount: {
              amount: 0,
              starts_at: null,
              expires_at: null,
            },
          });
        }}
      />
    </Flex>
  );
}
