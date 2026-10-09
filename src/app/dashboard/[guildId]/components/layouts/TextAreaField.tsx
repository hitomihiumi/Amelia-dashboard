"use client";

import type { ApplyEdit } from "@/components/dashboard/text/applyEdit";
import { TextToolbar } from "@/components/dashboard/text/TextToolbar";
import { useT } from "@/i18n/client";
import { Column, Row, Text, Textarea } from "@once-ui-system/core";
import { type ReactNode, useRef } from "react";

export interface TextAreaFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder?: string;
  invalid?: boolean;
  /** Extra controls on the right of the toolbar, e.g. "remove this text". */
  actions?: ReactNode;
}

/** A markdown textarea with a formatting toolbar, a placeholder menu and its own character count. */
export function TextAreaField({
  id,
  value,
  onChange,
  label,
  placeholder,
  invalid,
  actions,
}: TextAreaFieldProps) {
  const t = useT();
  const ref = useRef<HTMLTextAreaElement>(null);

  const apply: ApplyEdit = (edit) => {
    const el = ref.current;
    if (!el) return;
    const next = edit(el.value, el.selectionStart, el.selectionEnd);
    onChange(next.value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(next.start, next.end);
    });
  };

  return (
    <Column fillWidth gap="4">
      <Row fillWidth horizontal="between" vertical="center" gap="8" wrap>
        <Text variant="label-default-s" onBackground="neutral-medium">
          {label}
        </Text>
        <Text variant="label-default-xs" onBackground="neutral-weak">
          {t("layouts.text.chars", { count: value.length })}
        </Text>
      </Row>

      <TextToolbar apply={apply} actions={actions} />

      <Textarea
        ref={ref}
        id={id}
        label={placeholder ? undefined : label}
        placeholder={placeholder}
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={invalid}
      />
    </Column>
  );
}
