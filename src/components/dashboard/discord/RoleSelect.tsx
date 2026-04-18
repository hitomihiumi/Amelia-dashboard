"use client";

import React from "react";

import { SelectReact, type SelectProps } from "@/components/user/SelectReact";

export interface RoleSelectProps extends SelectProps {
  selectedRole: string;
  setSelectedRole: (role: string) => void;
}

export const RoleSelect: React.FC<RoleSelectProps> = ({
  setSelectedRole,
  selectedRole,
  id,
  placement,
  label,
  options,
  ...rest
}) => {
  return (
    <SelectReact
      id={id}
      label={label}
      onSelect={(value) => setSelectedRole(value)}
      value={selectedRole}
      placement={placement}
      options={options}
      {...rest}
    />
  );
};
