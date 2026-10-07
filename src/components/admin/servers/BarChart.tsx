import React from "react";
import classNames from "classnames";
import { Column, Row, Text } from "@once-ui-system/core";
import tones from "@/components/status/tones.module.scss";
import styles from "./Servers.module.scss";

export type ChartTone = "brand" | "success" | "danger" | "info" | "warning";

export interface ChartSeries {
  label: string;
  values: number[];
  tone: Exclude<ChartTone, "brand">;
  /** Drawn below the axis instead of above it (leaves next to joins). */
  mirrored?: boolean;
}

const WIDTH = 600;
const HEIGHT = 120;

interface BarChartProps {
  title: string;
  /** Headline number next to the title. */
  total: string;
  /** One label per bar, shown in the tooltip. */
  labels: string[];
  /** Short labels of the first and the last day under the chart. */
  edges: [string, string];
  series: ChartSeries[];
  formatNumber: (value: number) => string;
}

/**
 * Daily bars as plain SVG, so it renders on the server. One series draws bars from the bottom;
 * a mirrored second one draws below the middle line (joins up, leaves down).
 */
export function BarChart({ title, total, labels, edges, series, formatNumber }: BarChartProps) {
  const days = labels.length;
  const hasMirror = series.some((item) => item.mirrored);
  const up = series.filter((item) => !item.mirrored);
  const down = series.filter((item) => item.mirrored);

  const maxUp = Math.max(1, ...up.flatMap((item) => item.values));
  const maxDown = Math.max(1, ...down.flatMap((item) => item.values));

  const baseline = hasMirror ? HEIGHT * (maxUp / (maxUp + maxDown)) : HEIGHT;
  const upScale = baseline / maxUp;
  const downScale = (HEIGHT - baseline) / maxDown;

  const slot = WIDTH / days;
  const bar = Math.max(2, slot * 0.68);

  return (
    <Column fillWidth gap="12">
      <Row fillWidth horizontal="between" vertical="end" gap="12" wrap>
        <Text variant="label-default-s" onBackground="neutral-weak">
          {title}
        </Text>
        <Text variant="heading-strong-l" style={{ fontVariantNumeric: "tabular-nums" }}>
          {total}
        </Text>
      </Row>

      <svg
        className={styles.chart}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        role="img"
        aria-label={`${title}: ${total}`}
      >
        <line x1="0" x2={WIDTH} y1={baseline} y2={baseline} className={styles.axis} />
        {labels.map((label, index) => (
          <g key={label}>
            <rect x={index * slot} y={0} width={slot} height={HEIGHT} className={styles.hit}>
              <title>
                {label}
                {series
                  .map((item) => `\n${item.label}: ${formatNumber(item.values[index] ?? 0)}`)
                  .join("")}
              </title>
            </rect>
            {series.map((item) => {
              const value = item.values[index] ?? 0;
              if (value <= 0) return null;
              const height = Math.max(1.5, value * (item.mirrored ? downScale : upScale));
              // Several upward series sit side by side inside the slot.
              const width = bar / up.length;
              const offset = item.mirrored ? 0 : up.indexOf(item) * width;
              const x = index * slot + (slot - bar) / 2 + offset;
              return (
                <rect
                  key={item.label}
                  x={x}
                  y={item.mirrored ? baseline : baseline - height}
                  width={item.mirrored ? bar : width}
                  height={height}
                  rx="1.5"
                  className={classNames(styles.bar, tones[item.tone])}
                />
              );
            })}
          </g>
        ))}
      </svg>

      <Row fillWidth horizontal="between">
        <Text variant="body-default-xs" onBackground="neutral-weak">
          {edges[0]}
        </Text>
        {series.length > 1 && (
          <Row gap="12" wrap>
            {series.map((item) => (
              <Row key={item.label} gap="4" vertical="center">
                <span className={classNames(styles.legendDot, tones[item.tone])} aria-hidden />
                <Text variant="body-default-xs" onBackground="neutral-weak">
                  {item.label}
                </Text>
              </Row>
            ))}
          </Row>
        )}
        <Text variant="body-default-xs" onBackground="neutral-weak">
          {edges[1]}
        </Text>
      </Row>
    </Column>
  );
}

/** Tiny trend line for a list row. */
export function Sparkline({ values, label }: { values: number[]; label: string }) {
  const max = Math.max(1, ...values);
  const step = values.length > 1 ? 100 / (values.length - 1) : 100;
  const points = values.map(
    (value, index) => `${(index * step).toFixed(2)},${(22 - (value / max) * 20).toFixed(2)}`,
  );

  return (
    <svg
      className={styles.spark}
      viewBox="0 0 100 24"
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        className={styles.sparkLine}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
