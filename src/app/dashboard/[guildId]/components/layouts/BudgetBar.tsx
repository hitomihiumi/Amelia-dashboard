"use client";

import { useFormat, useT } from "@/i18n/client";
import {
  LAYOUT_LIMITS,
  type LayoutCustom,
  countLayoutComponents,
  countLayoutText,
} from "@/lib/db/types";
import { Column, Grid, Row, Tag, Text } from "@once-ui-system/core";
import styles from "./LayoutEditor.module.scss";

type BudgetState = "ok" | "warn" | "over";

/** Green until 85% of the limit, amber from there, red once it is exceeded. */
export function budgetState(value: number, max: number): BudgetState {
  if (value > max) return "over";
  return value >= max * 0.85 ? "warn" : "ok";
}

const STATE_SOLID = { ok: "success-strong", warn: "warning-strong", over: "danger-strong" } as const;
const STATE_TEXT = { ok: undefined, warn: "warning-strong", over: "danger-strong" } as const;

function Meter({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const format = useFormat();
  const state = budgetState(value, max);
  const percent = Math.min(100, (value / max) * 100);

  return (
    <Column gap="4" minWidth="0" data-budget-state={state}>
      <Row horizontal="between" gap="8" style={{ alignItems: "baseline" }}>
        <Text variant="label-default-xs" onBackground="neutral-weak">
          {label}
        </Text>
        <Text
          variant="label-strong-s"
          onBackground={STATE_TEXT[state]}
          style={{ fontVariantNumeric: "tabular-nums" }}
          data-state={state}
        >
          {format.number(value)}/{format.number(max)}
        </Text>
      </Row>
      <Row
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.min(value, max)}
        fillWidth
        radius="full"
        background="neutral-alpha-medium"
        overflow="hidden"
        style={{ height: 6 }}
      >
        <Row
          fillHeight
          radius="full"
          solid={STATE_SOLID[state]}
          data-state={state}
          style={{
            width: `${percent}%`,
            transition: "width 0.15s ease, background-color 0.15s ease",
          }}
        />
      </Row>
    </Column>
  );
}

/** Components and text budget of a layout, so Discord's limits are visible before saving. */
export function BudgetBar({
  layout,
  issueCount,
  compact = false,
}: {
  layout: Pick<LayoutCustom, "components">;
  issueCount?: number;
  compact?: boolean;
}) {
  const t = useT();

  return (
    <Grid
      fillWidth
      gap={compact ? "12" : "16"}
      paddingX={compact ? "12" : "16"}
      paddingY={compact ? "8" : "12"}
      border="neutral-medium"
      radius="m"
      background="neutral-alpha-weak"
      className={`${styles.budget} ${compact ? styles.budgetCompact : ""}`}
      data-budget
    >
      <Meter
        label={t("layouts.budget.components")}
        value={countLayoutComponents(layout)}
        max={LAYOUT_LIMITS.MAX_COMPONENTS}
      />
      <Meter
        label={t("layouts.budget.text")}
        value={countLayoutText(layout)}
        max={LAYOUT_LIMITS.MAX_TEXT_LENGTH}
      />
      {issueCount === undefined ? null : (
        <Tag
          scheme={issueCount > 0 ? "danger" : "success"}
          size="m"
          prefixIcon={issueCount > 0 ? "danger" : "check"}
          label={
            issueCount > 0
              ? t("layouts.budget.issues", { count: issueCount })
              : t("layouts.budget.valid")
          }
          className={styles.status}
          data-state={issueCount > 0 ? "issues" : "ok"}
        />
      )}
    </Grid>
  );
}
