"use client";

import { useFormat, useT } from "@/i18n/client";
import {
  LAYOUT_LIMITS,
  type LayoutCustom,
  countLayoutComponents,
  countLayoutText,
} from "@/lib/db/types";
import { Text } from "@once-ui-system/core";
import { LuCircleAlert, LuCircleCheck } from "react-icons/lu";
import styles from "./LayoutEditor.module.scss";

type BudgetState = "ok" | "warn" | "over";

/** Green until 85% of the limit, amber from there, red once it is exceeded. */
export function budgetState(value: number, max: number): BudgetState {
  if (value > max) return "over";
  return value >= max * 0.85 ? "warn" : "ok";
}

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
    <div className={styles.meter} data-budget-state={state}>
      <div className={styles.meterHead}>
        <Text variant="label-default-xs" onBackground="neutral-weak">
          {label}
        </Text>
        <Text variant="label-strong-s" className={styles.meterValue} data-state={state}>
          {format.number(value)}/{format.number(max)}
        </Text>
      </div>
      <div
        className={styles.meterTrack}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.min(value, max)}
      >
        <div className={styles.meterFill} data-state={state} style={{ width: `${percent}%` }} />
      </div>
    </div>
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
    <div className={`${styles.budget} ${compact ? styles.budgetCompact : ""}`} data-budget>
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
        <span className={styles.status} data-state={issueCount > 0 ? "issues" : "ok"}>
          {issueCount > 0 ? (
            <>
              <LuCircleAlert size={14} aria-hidden />
              {t("layouts.budget.issues", { count: issueCount })}
            </>
          ) : (
            <>
              <LuCircleCheck size={14} aria-hidden />
              {t("layouts.budget.valid")}
            </>
          )}
        </span>
      )}
    </div>
  );
}
