"use client";

import React from "react";

import { SelectReact, type SelectProps } from "@/components/user/SelectReact";
import { useT } from "@/i18n/client";

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
  // Servers have dozens of channels and roles, so searching is the default.
  searchable = true,
  placeholder,
  ...rest
}) => {
  const t = useT();
  const fallbackPlaceholder = multiple
    ? t("common.select.selectRoles")
    : t("common.select.selectRole");

  return (
    <SelectReact
      id={id}
      label={label}
      onSelect={(value) => setSelectedRole(value)}
      value={selectedRole}
      placement={placement}
      options={options}
      multiple={multiple}
      searchable={searchable}
      placeholder={placeholder ?? fallbackPlaceholder}
      {...rest}
    />
  );
};
