"use client";

import React from "react";

import type { DiscordRole } from "@/lib/discord/role-style";
import { RolePill } from "@/components/dashboard/discord/RolePill";
import { SelectReact } from "@/components/user/SelectReact";

export interface RoleSelectProps {
  roles: DiscordRole[];
  selectedRole: string;
  setSelectedRole: (role: string) => void;
}

export const RoleSelect: React.FC<RoleSelectProps> = ({ roles, setSelectedRole, selectedRole }) => {
  return (
    <SelectReact
      id={"role-select"}
      label={"Select a role"}
      onSelect={(value) => setSelectedRole(value)}
      value={selectedRole}
      placement={"bottom"}
      options={roles.map((role) => ({
        label: <RolePill roleColor={role.color} label={role.name} />,
        value: role.id,
      }))}
      max={1}
    />
  );
};
