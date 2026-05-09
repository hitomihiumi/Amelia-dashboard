"use client";

import React from "react";

import { SelectReact, type SelectProps } from "@/components/user/SelectReact";

export interface RoleSelectProps extends SelectProps {
  selectedRole: string | string[];
  setSelectedRole: (role: string | string[]) => void;
  multiple?: boolean;
}

export const RoleSelect: React.FC<RoleSelectProps> = ({
  setSelectedRole,
  selectedRole,
  id,
  placement,
  label,
  options,
  multiple = false,
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
      multiple={multiple}
      {...rest}
    />
  );
};
