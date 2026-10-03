"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Flex, Text, useToast, Button, Column, RevealFx } from "@once-ui-system/core";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";

import type { GuildSchema, ShopRole } from "@/lib/db/types";
import { useRouter } from "next/navigation";

import { ShopModal } from "@/components/dashboard/ShopModal";
import { DiscordRole } from "@/lib/discord/role-style";
import { updateShop } from "@/app/dashboard/[guildId]/shop/actions";
import { GuildActionState } from "@/types/dashboard";
import { RoleCard } from "@/components/dashboard/RoleCard";
import { DashIcon } from "@/components/dashboard/DashIcon";
import { useT } from "@/i18n/client";
import styles from "./ShopForm.module.scss";

type Form = GuildSchema["economy"]["shop"];

export function ShopFrom({
  guildId,
  defaultShop,
  guildRoles,
}: { guildId: string; defaultShop: Form; guildRoles: DiscordRole[] }) {
  const t = useT();
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
      addToast({ variant: "danger", message: t("settings.shared.noResponse") });
      return;
    }
    if (result.ok) {
      setBaseline({
        roles,
      });
      router.refresh();
      addToast({ variant: "success", message: t("settings.shop.saved") });
      return;
    }
    addToast({ variant: "danger", message: result.error ?? t("settings.shared.saveFailed") });
  }, [guildId, roles, router, addToast, t]);

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
    <Column gap="24" fillWidth>
      <RevealFx delay={300} translateY={-0.5} fillWidth>
        <Flex
          padding="24"
          border="neutral-medium"
          radius="l"
          background="surface"
          fillWidth
          className={styles.toolbar}
        >
          <div className={styles.toolbarText}>
            <DashIcon name={"cart"} />
            <Text variant="body-strong-l">{t("settings.shop.addTitle")}</Text>
          </div>
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
            {t("settings.shop.addButton")}
          </Button>
        </Flex>
      </RevealFx>

      {roles.length > 0 ? (
        <div className={styles.roles}>
          {roles.map((item, id) => {
            const discordRole = guildRoles.find((r) => r.id === item.role) as DiscordRole;
            return (
              <RevealFx delay={Math.min(400 + 100 * id, 900)} translateY={-0.5} fillWidth key={id}>
                <div className={styles.cell}>
                  <RoleCard
                    setRoles={setRoles}
                    setOpenModal={setOpenModal}
                    setNewRole={setNewRole}
                    role={item}
                    discordRole={discordRole}
                  />
                </div>
              </RevealFx>
            );
          })}
        </div>
      ) : (
        <RevealFx delay={400} translateY={-0.5} fillWidth>
          <div className={styles.empty}>
            <Text variant="body-strong-m">{t("settings.shop.emptyTitle")}</Text>
            <Text variant="body-default-s" onBackground="neutral-weak">
              {t("settings.shop.emptyHint")}
            </Text>
          </div>
        </RevealFx>
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
              addToast({ variant: "danger", message: t("settings.shop.alreadyExists") });
              return prev;
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
    </Column>
  );
}
