import React from "react";
import {
  Button,
  Column,
  DateRange,
  DateRangeInput,
  Dialog,
  Input,
  NumberInput,
  Text,
} from "@once-ui-system/core";
import { RoleSelect } from "@/components/dashboard/discord/RoleSelect";
import { DiscordRole } from "@/lib/discord/role-style";
import type { ShopRole } from "@/lib/db/types";
import { RolePill } from "@/components/dashboard/discord/RolePill";
import { useT } from "@/i18n/client";

export interface ShopModalProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  role: string;
  setRole: (newRole: string) => void;
  roles: DiscordRole[];
  shopRole: ShopRole;
  setShopRole: React.Dispatch<React.SetStateAction<ShopRole>>;
  onConfirm: () => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({
  open,
  setOpen,
  role,
  setRole,
  roles,
  shopRole,
  setShopRole,
  onConfirm,
}) => {
  const t = useT();

  const handleChange = (dateRange: DateRange) => {
    const { startDate, endDate } = dateRange;

    setShopRole((prev) => ({
      ...prev,
      discount: {
        ...prev.discount,
        starts_at: prev.discount.starts_at ? prev.discount.starts_at : startDate?.getTime() || null,
        expires_at: prev.discount.expires_at
          ? prev.discount.expires_at
          : endDate?.getTime() || null,
      },
    }));
  };

  const handleClose = () => {
    setOpen(false);
    setShopRole({
      role: "",
      price: 100,
      discount: {
        amount: 0,
        starts_at: null,
        expires_at: null,
      },
    });
  };

  return (
    <Dialog
      open={open}
      onClose={() => handleClose()}
      title={t("settings.shop.modalTitle")}
      description={t("settings.shop.modalDescription")}
      footer={
        <>
          <Button variant="secondary" onClick={() => handleClose()}>
            {t("common.actions.cancel")}
          </Button>
          <Button onClick={() => onConfirm()}>{t("common.actions.confirm")}</Button>
        </>
      }
    >
      <Column fillWidth gap="16">
        <Column gap={"8"} fillWidth>
          <RoleSelect
            id={"role-select"}
            label={t("common.select.selectRole")}
            options={roles.map((role) => ({
              label: <RolePill roleColor={role.color} label={role.name} />,
              value: role.id,
            }))}
            selectedRole={role}
            setSelectedRole={(role) => setRole(role as string)}
          />
          <NumberInput
            id={"price-set"}
            label={t("settings.shop.priceLabel")}
            value={shopRole.price}
            onChange={(value) => setShopRole((prev) => ({ ...prev, price: Number(value) }))}
            min={0}
            max={1000000}
            step={1}
          />
        </Column>
        <Column gap={"8"} fillWidth>
          <Text variant={"body-default-s"} onBackground={"neutral-weak"}>
            {t("settings.shop.discountHint")}
          </Text>
          <NumberInput
            id={"discount-amount"}
            label={t("settings.shop.discountAmount")}
            value={shopRole.discount.amount}
            onChange={(value) =>
              setShopRole((prev) => ({
                ...prev,
                discount: { ...prev.discount, amount: Number(value) },
              }))
            }
            min={0}
            max={100}
            step={1}
          />
          <DateRangeInput
            id="basic-date-range-example"
            startLabel={t("settings.shop.startDate")}
            endLabel={t("settings.shop.endDate")}
            value={{
              startDate: shopRole.discount.starts_at
                ? new Date(shopRole.discount.starts_at)
                : undefined,
              endDate: shopRole.discount.expires_at
                ? new Date(shopRole.discount.expires_at)
                : undefined,
            }}
            onChange={handleChange}
          />
        </Column>
      </Column>
    </Dialog>
  );
};
