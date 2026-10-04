"use client";

import { LabelSelect } from "@/components/dashboard/discord/LabelSelect";
import { useT } from "@/i18n/client";
import type { ButtonCustom, SelectMenuCustom } from "@/lib/db/types";
import { DISCORD_BUTTON_COLORS } from "@/lib/discord/discord-style";
import { Button, Column, Row, Text } from "@once-ui-system/core";
import type { ComponentProps } from "react";
import { BUTTON_STYLE_LABEL_KEY } from "../ButtonEditor";

type Option = ComponentProps<typeof LabelSelect>["options"][number];

/** The colour of a button as it looks in Discord, so stored buttons are recognisable in a list. */
export function ButtonSwatch({ style }: { style: ButtonCustom["style"] }) {
  return (
    <Row
      inline
      radius="xs"
      aria-hidden
      style={{
        width: 14,
        height: 14,
        flexShrink: 0,
        backgroundColor: (DISCORD_BUTTON_COLORS[style] ?? DISCORD_BUTTON_COLORS.PRIMARY).bg,
      }}
    />
  );
}

export function buttonName(button: ButtonCustom, fallback: string): string {
  return button.name || button.label || fallback;
}

/** Options for a button picker. A button that sits elsewhere in the layout cannot be picked again. */
export function useButtonOptions(
  buttons: ButtonCustom[],
  taken: (button: ButtonCustom) => boolean,
  hidden?: (button: ButtonCustom) => boolean,
): Option[] {
  const t = useT();

  return buttons
    .filter((button) => !hidden?.(button))
    .map((button) => {
      const disabled = taken(button);
      return {
        value: button.id,
        disabled,
        label: (
          <Row inline vertical="center" gap="8" minWidth="0">
            <ButtonSwatch style={button.style} />
            <Text>{buttonName(button, t("builder.fallback.button"))}</Text>
          </Row>
        ),
        description: disabled
          ? t("layouts.pickers.usedElsewhere")
          : `${t(BUTTON_STYLE_LABEL_KEY[button.style] ?? BUTTON_STYLE_LABEL_KEY.PRIMARY)} · ${button.label}`,
      };
    });
}

export function useSelectMenuOptions(
  menus: SelectMenuCustom[],
  taken: (menu: SelectMenuCustom) => boolean,
): Option[] {
  const t = useT();

  return menus.map((menu) => {
    const disabled = taken(menu);
    return {
      value: menu.id,
      disabled,
      label: menu.name || menu.placeholder || t("builder.fallback.selectMenu"),
      description: disabled
        ? t("layouts.pickers.usedElsewhere")
        : t("builder.shared.optionsCount", { count: menu.options.length }),
    };
  });
}

/** Shown instead of a picker when there is nothing stored to pick. */
export function NothingStored({
  kind,
  onGoto,
}: {
  kind: "buttons" | "selectMenus";
  onGoto?: () => void;
}) {
  const t = useT();

  return (
    <Column
      gap="8"
      padding="12"
      radius="m"
      border="neutral-medium"
      background="neutral-alpha-weak"
      horizontal="start"
    >
      <Text variant="body-default-s" onBackground="neutral-medium">
        {kind === "buttons" ? t("layouts.pickers.noButtons") : t("layouts.pickers.noSelectMenus")}
      </Text>
      {onGoto ? (
        <Button size="s" variant="secondary" onClick={onGoto}>
          {kind === "buttons" ? t("layouts.pickers.gotoButtons") : t("layouts.pickers.gotoSelectMenus")}
        </Button>
      ) : null}
    </Column>
  );
}
