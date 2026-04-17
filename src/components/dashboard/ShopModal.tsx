import React from "react";
import {
  Button,
  Column,
  DateRange,
  DateRangeInput,
  Dialog,
  Input,
  Text,
} from "@once-ui-system/core";
import { RoleSelect } from "@/components/dashboard/discord/RoleSelect";
import { DiscordRole } from "@/lib/discord/role-style";
import type { ShopRole } from "@/lib/db/types";

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
      isOpen={open}
      onClose={() => handleClose()}
      title="Shop Modal"
      description="This is a modal for the shop. You can put any content you want here."
      footer={
        <>
          <Button variant="secondary" onClick={() => handleClose()}>
            Cancel
          </Button>
          <Button onClick={() => onConfirm()}>Confirm</Button>
        </>
      }
    >
      <Column fillWidth gap="16">
        <Column gap={"8"} fillWidth>
          <RoleSelect roles={roles} selectedRole={role} setSelectedRole={setRole} />
          <Input
            id={"price-set"}
            label={"Price"}
            value={shopRole.price}
            onChange={(e) => setShopRole((prev) => ({ ...prev, price: Number(e.target.value) }))}
            min={0}
            max={1000000}
            step={1}
          />
        </Column>
        <Column gap={"8"} fillWidth>
          <Text variant={"body-default-s"} onBackground={"neutral-weak"}>
            You can set a discount for this role. You can set the discount amount and the start and
            end date of the discount.
          </Text>
          <Input
            id={"discount-amount"}
            label={"Discount amount (%)"}
            value={shopRole.discount.amount}
            onChange={(e) =>
              setShopRole((prev) => ({
                ...prev,
                discount: { ...prev.discount, amount: Number(e.target.value) },
              }))
            }
            min={0}
            max={100}
            step={1}
          />
          <DateRangeInput
            id="basic-date-range-example"
            startLabel="Start date"
            endLabel="End date"
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
