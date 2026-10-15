import { Column, Row, Text } from "@once-ui-system/core";
import { memo } from "react";
import type { Formatters } from "@/i18n/format";
import type { Translator } from "@/i18n/translate";
import {
  FREE_SPIN_WIN_MULTIPLIER,
  LINE_SYMBOLS,
  PAYLINES,
  SLOT_PAIR_CHERRY_MULTIPLIER,
  SLOT_TRIPLE_MULTIPLIER,
  freeSpinChance,
  freeSpinsFor,
  lineHitChance,
  pairCherryChance,
  theoreticalReturn,
  tripleChance,
} from "@/lib/slots/config";
import styles from "./SlotMachine.module.scss";
import { SlotSymbolIcon } from "./symbols";

/** Colours of the nine lines, the same as on the reels. */
export const LINE_COLORS = [
  "#ff5460",
  "#ffc928",
  "#5ad1ff",
  "#7ee37e",
  "#d98bff",
  "#ff9a3d",
  "#46e0c0",
  "#ff7ab8",
  "#b7c4ff",
];

/** A tiny 3 × 3 grid with the path of one line. */
function LineDiagram({ rows, color, n }: { rows: readonly number[]; color: string; n: number }) {
  const points = rows.map((row, reel) => `${reel * 14 + 9},${row * 12 + 8}`).join(" ");
  return (
    <Column gap="4" horizontal="center">
      <svg viewBox="0 0 46 40" width="46" height="40" aria-hidden="true" focusable="false">
        <rect
          x="0.5"
          y="0.5"
          width="45"
          height="39"
          rx="5"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.25"
        />
        {[0, 1, 2].flatMap((reel) =>
          [0, 1, 2].map((row) => (
            <circle
              key={`${reel}${row}`}
              cx={reel * 14 + 9}
              cy={row * 12 + 8}
              r="2"
              fill="currentColor"
              fillOpacity="0.3"
            />
          )),
        )}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <Text variant="label-default-xs" onBackground="neutral-weak">
        {n}
      </Text>
    </Column>
  );
}

/**
 * Every winning combination with what it pays and how rare it is, the lines and the free spins. The
 * odds are worked out from the same numbers the server draws with, so what is shown here is what is played.
 */
// The odds never change while the page is open, so they are worked out once.
const ROWS = [...LINE_SYMBOLS].sort(
  (a, b) => SLOT_TRIPLE_MULTIPLIER[a] - SLOT_TRIPLE_MULTIPLIER[b],
);
const ODDS = {
  triple: Object.fromEntries(
    LINE_SYMBOLS.map((symbol) => [symbol, Math.round(1 / tripleChance(symbol))]),
  ),
  pair: Math.round(1 / pairCherryChance()),
  scatter: Math.round(1 / freeSpinChance()),
  hit: Math.round((1 / lineHitChance()) * 10) / 10,
  returnPercent: theoreticalReturn() * 100,
};

export const PayTable = memo(function PayTable({
  t,
  format,
}: { t: Translator; format: Formatters }) {
  const rows = ROWS;

  return (
    <Column gap="24" fillWidth>
      <Column gap="16" fillWidth>
        <Column gap="4">
          <Text variant="heading-strong-m">{t("slots.paytable.title")}</Text>
          <Text variant="body-default-s" onBackground="neutral-weak">
            {t("slots.paytable.description")}
          </Text>
        </Column>

        <Column gap="8" fillWidth>
          {rows.map((symbol) => (
            <div key={symbol} className={styles.payRow}>
              <div className={styles.paySymbols}>
                <SlotSymbolIcon symbol={symbol} className={styles.paySymbol} />
              </div>
              <Text variant="body-default-s">
                {t("slots.paytable.threeOf")} · {t(`slots.symbols.${symbol}`)}
              </Text>
              <Text variant="body-default-xs" onBackground="neutral-weak">
                {t("slots.paytable.chance", { n: format.number(ODDS.triple[symbol]) })}
              </Text>
              <Text variant="body-strong-m" className={styles.payMultiplier}>
                {t("slots.paytable.pays", {
                  multiplier: format.number(SLOT_TRIPLE_MULTIPLIER[symbol]),
                })}
              </Text>
            </div>
          ))}
          <div className={styles.payRow}>
            <div className={styles.paySymbols}>
              <SlotSymbolIcon symbol="cherry" className={styles.paySymbol} />
            </div>
            <Text variant="body-default-s">{t("slots.paytable.twoCherries")}</Text>
            <Text variant="body-default-xs" onBackground="neutral-weak">
              {t("slots.paytable.chance", { n: format.number(ODDS.pair) })}
            </Text>
            <Text variant="body-strong-m" className={styles.payMultiplier}>
              {t("slots.paytable.pays", { multiplier: format.number(SLOT_PAIR_CHERRY_MULTIPLIER) })}
            </Text>
          </div>
          <div className={styles.payRow}>
            <div className={styles.paySymbols}>
              <SlotSymbolIcon symbol="scatter" className={styles.paySymbol} />
            </div>
            <Text variant="body-default-s">{t("slots.paytable.scatterRow")}</Text>
            <Text variant="body-default-xs" onBackground="neutral-weak">
              {t("slots.paytable.chance", { n: format.number(ODDS.scatter) })}
            </Text>
            <Text variant="body-strong-m" className={styles.payMultiplier}>
              {t("slots.paytable.scatterPays", { count: freeSpinsFor(3) })}
            </Text>
          </div>
        </Column>
      </Column>

      <Column gap="12" fillWidth>
        <Text variant="heading-strong-s">{t("slots.paytable.linesTitle")}</Text>
        <Text variant="body-default-s" onBackground="neutral-weak">
          {t("slots.paytable.linesText")}
        </Text>
        <Row gap="12" wrap>
          {PAYLINES.map((rowsOfLine, index) => (
            <LineDiagram key={index} rows={rowsOfLine} color={LINE_COLORS[index]} n={index + 1} />
          ))}
        </Row>
        <Text variant="body-default-s" onBackground="neutral-weak">
          {t("slots.paytable.freeText", { multiplier: FREE_SPIN_WIN_MULTIPLIER })}
        </Text>
      </Column>

      <Column gap="8">
        <Text variant="body-default-s">
          {t("slots.paytable.returnLine", {
            rtp: format.number(ODDS.returnPercent, { maximumFractionDigits: 1 }),
          })}
        </Text>
        <Text variant="body-default-s" onBackground="neutral-weak">
          {t("slots.paytable.hitLine", { n: format.number(ODDS.hit) })}
        </Text>
        <Text variant="body-default-s" onBackground="neutral-weak">
          {t("slots.paytable.freeLine", { n: format.number(ODDS.scatter) })}
        </Text>
        <Text variant="body-default-s" onBackground="neutral-weak">
          {t("slots.paytable.fairLine")}
        </Text>
      </Column>
    </Column>
  );
});
