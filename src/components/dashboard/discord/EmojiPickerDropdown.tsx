"use client";

import { useT } from "@/i18n/client";
import type { PickedEmoji } from "@/lib/discord/emojis-api";
import { Button, DropdownWrapper, IconButton } from "@once-ui-system/core";
import type { ReactNode } from "react";
import { useState } from "react";
import { LuSmilePlus } from "react-icons/lu";
import { EmojiPicker } from "./EmojiPicker";

export interface EmojiPickerDropdownProps {
  /** Defaults to the guild of the dashboard page. */
  guildId?: string;
  onSelect: (emoji: PickedEmoji) => void;
  /** The element that opens the picker; a text button when omitted. */
  trigger?: ReactNode;
  /** Offer only standard emojis. */
  unicodeOnly?: boolean;
  placement?: React.ComponentProps<typeof DropdownWrapper>["placement"];
  onOpenChange?: (open: boolean) => void;
}

/** A button that opens the emoji panel in a popover and closes it after a pick. */
export function EmojiPickerDropdown({
  guildId,
  onSelect,
  trigger,
  unicodeOnly,
  placement = "bottom-end",
  onOpenChange,
}: EmojiPickerDropdownProps) {
  const t = useT();
  const [open, setOpen] = useState(false);

  const change = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  return (
    <DropdownWrapper
      open={open}
      onOpenChange={change}
      placement={placement}
      handleArrowNavigation={false}
      trigger={trigger ?? <Button variant="secondary" size="m">{t("common.emoji.change")}</Button>}
      dropdown={
        // The panel brings its own chrome, so the wrapper must not add padding around it.
        open ? (
          <EmojiPicker
            guildId={guildId}
            unicodeOnly={unicodeOnly}
            onSelect={onSelect}
            onClose={() => change(false)}
          />
        ) : null
      }
    />
  );
}

/** Compact icon trigger for a picker (smiley with a plus). */
export function EmojiPickerIconButton({ label, ...props }: Omit<EmojiPickerDropdownProps, "trigger"> & { label?: string }) {
  const t = useT();
  const text = label ?? t("common.emoji.pick");
  return (
    <EmojiPickerDropdown
      {...props}
      trigger={
        <IconButton variant="tertiary" size="m" tooltip={text} aria-label={text} type="button">
          <LuSmilePlus size={18} />
        </IconButton>
      }
    />
  );
}
