"use client";

import { type SelectProps, SelectReact } from "@/components/user/SelectReact";
import type React from "react";

export interface LabelSelectProps extends SelectProps {
  selectedValue: string | string[];
  setSelectedValue: (value: string | string[]) => void;
  multiple?: boolean;
}

/** Generic once-ui Select for simple label/value options (embeds, buttons, menus, modals). */
export const LabelSelect: React.FC<LabelSelectProps> = ({
  setSelectedValue,
  selectedValue,
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
      onSelect={(value) => setSelectedValue(value)}
      value={selectedValue}
      placement={placement}
      options={options}
      multiple={multiple}
      {...rest}
    />
  );
};
