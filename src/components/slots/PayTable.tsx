import { Column, Row, Text } from "@once-ui-system/core";
import { memo } from "react";
import type { Formatters } from "@/i18n/format";
import type { Translator } from "@/i18n/translate";
import {
  FREE_SPIN_WIN_MULTIPLIER,
  LINE_SYMBOLS,
  type LineSymbol,
  PAYLINES,
  type ReelCount,
  SLOT_PAIR_CHERRY_MULTIPLIER,
  freeSpinChance,
  freeSpinsFor,
  lineHitChance,
  pairCherryChance,
  rulesFor,
  symbolChance,
  theoreticalReturn,
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

/** A tiny grid with the path of one line. */
function LineDiagram({
  path,
  reels,
  color,
  n,
}: { path: readonly number[]; reels: number; color: string; n: number }) {
  const width = reels * 14 + 4;
  const points = path
    .slice(0, reels)
    .map((row, reel) => `${reel * 14 + 9},${row * 12 + 8}`)
    .join(" ");
  return (
    <Column gap="4" horizontal="center">
      <svg
        viewBox={`0 0 ${width} 40`}
        width={width}
        height="40"
        aria-hidden="true"
        focusable="false"
      >
        <rect
          x="0.5"
          y="0.5"
          width={width - 1}
          height="39"
          rx="5"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.25"
        />
        {Array.from({ length: reels }, (_, reel) =>
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

/** What is shown for one width. The odds never change while the page is open, so each is worked out once. */
interface Odds {
  rows: LineSymbol[];
  /** One in this many lines has three or more of the symbol in a row. */
  run: Record<LineSymbol, number>;
  pair: number;
  scatter: number;
  hit: number;
  returnPercent: number;
}

const cache = new Map<ReelCount, Odds>();

function oddsFor(reels: ReelCount): Odds {
  const known = cache.get(reels);
  if (known) return known;
  const pays = rulesFor(reels).pays;
  const odds: Odds = {
    rows: [...LINE_SYMBOLS].sort((a, b) => pays[a][0] - pays[b][0]),
    run: Object.fromEntries(
      LINE_SYMBOLS.map((symbol) => [symbol, Math.round(1 / symbolChance(symbol, reels) ** 3)]),
    ) as Record<LineSymbol, number>,
    pair: Math.round(1 / pairCherryChance(reels)),
    scatter: Math.round(1 / freeSpinChance(reels)),
    hit: Math.round((1 / lineHitChance(reels)) * 10) / 10,
    returnPercent: theoreticalReturn(reels) * 100,
  };
  cache.set(reels, odds);
  return odds;
}

/**
 * Every winning combination with what it pays and how rare it is, the lines and the free spins. The
 * odds are worked out from the same numbers the server draws with, so what is shown here is what is played.
 */
export const PayTable = memo(function PayTable({
  t,
  format,
  reels,
}: { t: Translator; format: Formatters; reels: ReelCount }) {
  const odds = oddsFor(reels);
  const rules = rulesFor(reels);
  const runs = Array.from({ length: reels - 2 }, (_, i) => i + 3).join(" · ");
  const minScatters = rules.minScatters;
  const pays = (symbol: LineSymbol) =>
    rules.pays[symbol]
      .slice(0, reels - 2)
      .map((multiplier) => t("slots.paytable.pays", { multiplier: format.number(multiplier) }))
      .join(" · ");

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
          {odds.rows.map((symbol) => (
            <div key={symbol} className={styles.payRow}>
              <div className={styles.paySymbols}>
                <SlotSymbolIcon symbol={symbol} className={styles.paySymbol} />
              </div>
              <Text variant="body-default-s">
                {t(`slots.symbols.${symbol}`)} · {t("slots.paytable.inARow", { counts: runs })}
              </Text>
              <Text variant="body-default-xs" onBackground="neutral-weak">
                {t("slots.paytable.chance", { n: format.number(odds.run[symbol]) })}
              </Text>
              <Text variant="body-strong-m" className={styles.payMultiplier}>
                {pays(symbol)}
              </Text>
            </div>
          ))}
          <div className={styles.payRow}>
            <div className={styles.paySymbols}>
              <SlotSymbolIcon symbol="cherry" className={styles.paySymbol} />
            </div>
            <Text variant="body-default-s">{t("slots.paytable.twoCherries")}</Text>
            <Text variant="body-default-xs" onBackground="neutral-weak">
              {t("slots.paytable.chance", { n: format.number(odds.pair) })}
            </Text>
            <Text variant="body-strong-m" className={styles.payMultiplier}>
              {t("slots.paytable.pays", { multiplier: format.number(SLOT_PAIR_CHERRY_MULTIPLIER) })}
            </Text>
          </div>
          <div className={styles.payRow}>
            <div className={styles.paySymbols}>
              <SlotSymbolIcon symbol="scatter" className={styles.paySymbol} />
            </div>
            <Text variant="body-default-s">
              {t("slots.paytable.scatterRow", { min: minScatters })}
            </Text>
            <Text variant="body-default-xs" onBackground="neutral-weak">
              {t("slots.paytable.chance", { n: format.number(odds.scatter) })}
            </Text>
            <Text variant="body-strong-m" className={styles.payMultiplier}>
              {t("slots.paytable.scatterPays", { count: freeSpinsFor(reels, minScatters) })}
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
          {PAYLINES.map((path, index) => (
            <LineDiagram
              key={index}
              path={path}
              reels={reels}
              color={LINE_COLORS[index]}
              n={index + 1}
            />
          ))}
        </Row>
        <Text variant="body-default-s" onBackground="neutral-weak">
          {t("slots.paytable.freeText", {
            min: minScatters,
            b: minScatters + 1,
            c: minScatters + 2,
            d: minScatters + 3,
            multiplier: FREE_SPIN_WIN_MULTIPLIER,
          })}
        </Text>
      </Column>

      <Column gap="8">
        <Text variant="body-default-s">
          {t("slots.paytable.returnLine", {
            rtp: format.number(odds.returnPercent, { maximumFractionDigits: 1 }),
          })}
        </Text>
        <Text variant="body-default-s" onBackground="neutral-weak">
          {t("slots.paytable.hitLine", { n: format.number(odds.hit) })}
        </Text>
        <Text variant="body-default-s" onBackground="neutral-weak">
          {t("slots.paytable.freeLine", { n: format.number(odds.scatter) })}
        </Text>
        <Text variant="body-default-s" onBackground="neutral-weak">
          {t("slots.paytable.fairLine")}
        </Text>
      </Column>
    </Column>
  );
});
