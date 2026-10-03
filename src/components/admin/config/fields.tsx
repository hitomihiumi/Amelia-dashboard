"use client";

import React, { type KeyboardEvent, type ReactNode, useRef } from "react";
import { Button, Column, Input, Textarea } from "@once-ui-system/core";
import type { Tone } from "@/lib/admin/defaults";
import { useT } from "@/i18n/client";
import styles from "./Config.module.scss";

export function Counter({ count, max }: { count: number; max: number }) {
  const t = useT();
  const level = count >= max ? "full" : count >= max * 0.9 ? "near" : "ok";

  return (
    <span className={styles.counter} data-level={level} aria-hidden>
      {t("admin.config.counter", { count, max })}
    </span>
  );
}

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  max: number;
  /** A number renders a textarea with that many lines. */
  lines?: number;
  placeholder?: string;
  /** Shown under the field, left of the counter. */
  hint?: ReactNode;
  /** Adds a "reset to default" button; disabled while the value already is the default. */
  onReset?: () => void;
  resetDisabled?: boolean;
  error?: string;
  suffix?: ReactNode;
  size?: "s" | "m";
  disabled?: boolean;
}

/** An input or textarea with a hint, a character counter and an optional reset button. */
export function TextField({
  id,
  label,
  value,
  onChange,
  max,
  lines,
  placeholder,
  hint,
  onReset,
  resetDisabled,
  error,
  suffix,
  size,
  disabled,
}: TextFieldProps) {
  const t = useT();

  return (
    <Column fillWidth gap="4">
      {lines ? (
        <Textarea
          id={id}
          label={label}
          lines={lines}
          size={size}
          value={value}
          maxLength={max}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          id={id}
          label={label}
          size={size}
          value={value}
          maxLength={max}
          placeholder={placeholder}
          disabled={disabled}
          error={Boolean(error)}
          errorMessage={error}
          suffix={suffix}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      <div className={styles.fieldMeta}>
        <span className={styles.metaText}>{hint}</span>
        <span className={styles.metaTools}>
          {onReset && (
            <Button
              variant="tertiary"
              size="s"
              prefixIcon="refresh"
              disabled={resetDisabled}
              onClick={onReset}
            >
              {t("admin.config.reset")}
            </Button>
          )}
          <Counter count={value.length} max={max} />
        </span>
      </div>
    </Column>
  );
}

export interface ChipOption {
  value: string;
  label: string;
  tone: Tone;
}

/**
 * Single choice shown as coloured chips: a radio group with arrow-key navigation,
 * so the colour carries meaning without being the only cue (the label is always there).
 */
export function ChipPicker({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: ChipOption[];
  onChange: (value: string) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  const move = (event: KeyboardEvent, index: number) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!step) return;

    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    onChange(options[next].value);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} className={styles.chips}>
      {options.map((option, index) => (
        <button
          key={option.value}
          ref={(node) => {
            refs.current[index] = node;
          }}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          tabIndex={index === selected ? 0 : -1}
          className={styles.chip}
          data-tone={option.tone}
          onClick={() => onChange(option.value)}
          onKeyDown={(event) => move(event, index)}
        >
          <span aria-hidden className={styles.chipDot} />
          {option.label}
        </button>
      ))}
    </div>
  );
}
