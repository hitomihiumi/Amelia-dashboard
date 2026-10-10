"use client";

import { useT } from "@/i18n/client";
import { placeholderGroups, type PlaceholderDef } from "@/lib/discord/placeholders";
import { insertTemplate } from "@/lib/layouts/markdown";
import { Column, DropdownWrapper, IconButton, Line, Option, Text } from "@once-ui-system/core";
import { Fragment, type ComponentProps, useState } from "react";
import { LuBraces } from "react-icons/lu";
import type { ApplyEdit } from "./applyEdit";

export interface PlaceholderMenuProps {
  apply: ApplyEdit;
  /** Offer only values that work as a link or an id (thumbnail, icon and button URLs). */
  urlOnly?: boolean;
  /** Offer the scenario group. Off for messages that are posted outside a scenario. */
  scenario?: boolean;
  /** `s` ghost button for the formatting bar, `m` for a field. */
  size?: "s" | "m";
  placement?: ComponentProps<typeof DropdownWrapper>["placement"];
}

/** A button with a menu of the placeholders the bot fills in when the message is sent. */
export function PlaceholderMenu({
  apply,
  urlOnly = false,
  scenario = true,
  size = "s",
  placement = "bottom-start",
}: PlaceholderMenuProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const groups = placeholderGroups({ urlOnly, scenario });

  const pick = (item: PlaceholderDef) => {
    setOpen(false);
    apply((value, start, end) => insertTemplate(value, start, end, item.insert, item.select));
  };

  return (
    <DropdownWrapper
      open={open}
      onOpenChange={setOpen}
      placement={placement}
      trigger={
        <IconButton
          icon="text"
          type="button"
          variant={size === "s" ? "ghost" : "tertiary"}
          size={size}
          tooltip={t("common.textTools.placeholders.menu")}
          aria-label={t("common.textTools.placeholders.menu")}
          // Clicking must not take the caret out of the field the placeholder goes into.
          onMouseDown={(event: React.MouseEvent) => event.preventDefault()}
        >
          <LuBraces size={size === "s" ? 15 : 18} />
        </IconButton>
      }
      dropdown={
        <Column gap="2" padding="4" minWidth={18} maxHeight={26} style={{ overflowY: "auto" }}>
          <Text variant="body-default-xs" onBackground="neutral-weak" paddingX="8" paddingY="4">
            {urlOnly
              ? t("common.textTools.placeholders.urlHint")
              : t("common.textTools.placeholders.hint", { token: "{user.name}" })}
          </Text>
          {groups.map((group, index) => (
            <Fragment key={group.id}>
              {index > 0 ? <Line background="neutral-alpha-weak" marginY="4" /> : null}
              <Column gap="2" paddingX="8" paddingTop="4">
                <Text variant="label-default-xs" onBackground="neutral-medium">
                  {t(group.labelKey)}
                </Text>
                {group.hintKey ? (
                  <Text variant="body-default-xs" onBackground="neutral-weak">
                    {t(group.hintKey)}
                  </Text>
                ) : null}
              </Column>
              {group.items.map((item) => (
                <Option
                  key={item.id}
                  value={item.id}
                  label={t(item.labelKey)}
                  description={item.token}
                  onClick={() => pick(item)}
                />
              ))}
            </Fragment>
          ))}
        </Column>
      }
    />
  );
}
