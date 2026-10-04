"use client";

import { useT } from "@/i18n/client";
import type { ParentId } from "@/lib/layouts/blocks";
import { Button, Column, DropdownWrapper, Option, Text } from "@once-ui-system/core";
import { Fragment, useState } from "react";
import { ADD_GROUPS, KIND_META } from "./blockMeta";
import { useEditorActions } from "./editorContext";

/** The "Add block" menu: grouped block types with an icon and a one-line description. */
export function AddBlockMenu({
  parentId,
  variant = "secondary",
  label,
}: {
  parentId: ParentId;
  variant?: "primary" | "secondary";
  label?: string;
}) {
  const t = useT();
  const actions = useEditorActions();
  const [open, setOpen] = useState(false);
  // A container cannot hold another container.
  const nested = parentId !== null;

  return (
    <DropdownWrapper
      open={open}
      onOpenChange={setOpen}
      placement="bottom-start"
      trigger={
        <Button size="m" variant={variant} prefixIcon="plus" aria-haspopup="menu">
          {label ?? t("layouts.add.button")}
        </Button>
      }
      dropdown={
        <Column gap="2" padding="4" minWidth={18} maxHeight={28} style={{ overflowY: "auto" }}>
          {ADD_GROUPS.map((group) => {
            const kinds = group.kinds.filter((kind) => !(nested && kind === "container"));
            if (kinds.length === 0) return null;
            return (
              <Fragment key={group.title}>
                <Text
                  variant="label-default-xs"
                  onBackground="neutral-weak"
                  paddingX="8"
                  paddingTop="8"
                  paddingBottom="4"
                >
                  {t(group.title)}
                </Text>
                {kinds.map((kind) => (
                  <Option
                    key={kind}
                    value={kind}
                    label={t(KIND_META[kind].label)}
                    description={t(KIND_META[kind].description)}
                    prefix={KIND_META[kind].icon(18)}
                    onClick={() => {
                      setOpen(false);
                      actions.add(kind, parentId);
                    }}
                  />
                ))}
              </Fragment>
            );
          })}
        </Column>
      }
    />
  );
}
