"use client";

import React from "react";

import { ShopRole } from "@/lib/db/types";
import { Button, Column, Flex, Row, Text } from "@once-ui-system/core";
import { RolePill } from "@/components/dashboard/discord/RolePill";
import { DiscordRole } from "@/lib/discord/role-style";

export interface RoleCardProps {
  role: ShopRole;
  discordRole: DiscordRole;
  setOpenModal: (open: boolean) => void;
  setNewRole: (newRole: ShopRole) => void;
  setRoles: React.Dispatch<React.SetStateAction<ShopRole[]>>;
}

export const RoleCard: React.FC<RoleCardProps> = ({
  role,
  discordRole,
  setNewRole,
  setRoles,
  setOpenModal,
}) => {
  const formatDate = (date: number | Date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const saleDate =
    role.discount.starts_at && role.discount.expires_at
      ? `${formatDate(role.discount.starts_at)} - ${formatDate(role.discount.expires_at)}`
      : null;

  return (
    <Column
      padding="16"
      radius="m"
      border="neutral-medium"
      background={"surface"}
      vertical="center"
      horizontal="center"
      gap={"16"}
    >
      <Column center fill gap={"4"}>
        <RolePill roleColor={discordRole?.color || 0} label={discordRole?.name || "Unknown Role"} />
        {role.discount.amount > 0 && (
          <Text variant="body-default-s" onBackground={"neutral-weak"}>
            On Sale {saleDate}
          </Text>
        )}
      </Column>
      <Column gap={"16"} fillWidth>
        <Row horizontal="between">
          <Column center>
            <Text variant="body-default-s" onBackground={"neutral-weak"}>
              PRICE
            </Text>
            {role.discount.amount > 0 ? (
              <Row gap={"4"} vertical="center">
                <Text variant="body-default-m" onBackground={"neutral-weak"}>
                  <s>{role.price}</s>
                </Text>
                <Text variant="body-default-m">
                  {Math.floor(role.price * (1 - role.discount.amount / 100))}
                </Text>
              </Row>
            ) : (
              <Text variant="body-default-m">{role.price}</Text>
            )}
          </Column>
          {role.discount.amount > 0 && (
            <Column center>
              <Text variant="body-default-s" onBackground={"neutral-weak"}>
                DISCOUNT
              </Text>
              <Text variant="body-default-m" onBackground={"brand-weak"}>
                {role.discount.amount}%
              </Text>
            </Column>
          )}
        </Row>
        <Flex direction="row" gap="8" horizontal={"between"}>
          <Button
            variant="secondary"
            onClick={() => {
              setNewRole(role);
              setOpenModal(true);
            }}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              setRoles((prev) => prev.filter((lRole) => lRole.role !== role.role));
            }}
          >
            Remove
          </Button>
        </Flex>
      </Column>
    </Column>
  );
};
