"use client";

import React, { type ComponentProps, type ReactNode, useState } from "react";
import { Column, DropdownWrapper, Option } from "@once-ui-system/core";

export interface MenuOption {
  value: string;
  label: string;
}

/** A button that opens a short list and reports the chosen value (a compact `select`). */
export function MenuSelect({
  trigger,
  options,
  value,
  onSelect,
  placement = "bottom-start",
  minWidth = 10,
}: {
  /** The focusable control that opens the list, usually a `Button`. */
  trigger: ReactNode;
  options: MenuOption[];
  value: string;
  onSelect: (value: string) => void;
  placement?: ComponentProps<typeof DropdownWrapper>["placement"];
  minWidth?: number;
}) {
  const [open, setOpen] = useState(false);

  return (
    <DropdownWrapper
      open={open}
      onOpenChange={setOpen}
      placement={placement}
      trigger={trigger}
      dropdown={
        <Column gap="2" padding="4" minWidth={minWidth}>
          {options.map((option) => (
            <Option
              key={option.value}
              fillWidth
              value={option.value}
              selected={option.value === value}
              label={option.label}
              onClick={() => {
                setOpen(false);
                onSelect(option.value);
              }}
            />
          ))}
        </Column>
      }
    />
  );
}
