"use client";

import type { IconName } from "@/resources/icons";
import { Button, IconButton, Row, Text } from "@once-ui-system/core";
import type React from "react";
import { useState } from "react";

export interface ConfirmIconButtonProps {
  /** "immediate" deletes on a single click (default UX); "confirm" expands an inline
   * warning + Confirm/Cancel row first — no overlay/backdrop, purely inline DOM state. */
  variant: "immediate" | "confirm";
  onConfirm: () => void;
  icon?: IconName;
  tooltip?: string;
  /** Shown next to the Confirm/Cancel buttons when expanded (e.g. "Used in 2 scenarios: ..."). */
  confirmMessage?: React.ReactNode;
  size?: "xs" | "s" | "m" | "l" | "xl";
}

/** A non-modal delete control: expands in place instead of opening a Dialog. */
export function ConfirmIconButton({
  variant,
  onConfirm,
  icon = "trash",
  tooltip = "Delete",
  confirmMessage,
  size = "s",
}: ConfirmIconButtonProps) {
  const [pending, setPending] = useState(false);

  const stop = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    e.preventDefault();
  };

  if (variant === "immediate" || !pending) {
    return (
      <IconButton
        icon={icon}
        variant="ghost"
        size={size}
        tooltip={tooltip}
        onClick={(e: React.SyntheticEvent) => {
          stop(e);
          if (variant === "immediate") onConfirm();
          else setPending(true);
        }}
      />
    );
  }

  return (
    <Row
      gap="8"
      vertical="center"
      onClick={stop}
      background="danger-alpha-weak"
      radius="s"
      paddingX="8"
      paddingY="4"
    >
      {confirmMessage ? (
        <Text variant="body-default-s" onBackground="danger-medium" style={{ maxWidth: 280 }}>
          {confirmMessage}
        </Text>
      ) : (
        <Text variant="body-default-s" onBackground="danger-medium">
          Delete?
        </Text>
      )}
      <Button
        size="s"
        variant="secondary"
        onClick={(e: React.SyntheticEvent) => {
          stop(e);
          setPending(false);
        }}
      >
        Cancel
      </Button>
      <Button
        size="s"
        variant="danger"
        onClick={(e: React.SyntheticEvent) => {
          stop(e);
          setPending(false);
          onConfirm();
        }}
      >
        Confirm
      </Button>
    </Row>
  );
}
