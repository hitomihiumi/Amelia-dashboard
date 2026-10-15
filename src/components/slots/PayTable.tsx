import { Column, Row, Text } from "@once-ui-system/core";
import type { Formatters } from "@/i18n/format";
import type { Translator } from "@/i18n/translate";
import {
  SLOT_PAIR_CHERRY_MULTIPLIER,
  SLOT_SYMBOLS,
  SLOT_TRIPLE_MULTIPLIER,
  hitChance,
  pairCherryChance,
  theoreticalReturn,
  tripleChance,
} from "@/lib/slots/config";
import styles from "./SlotMachine.module.scss";
import { SlotSymbolIcon } from "./symbols";

/**
 * Every winning combination with what it pays and how rare it is. The odds are worked out from
 * the same numbers the server draws with, so what is shown here is what is played.
 */
export function PayTable({ t, format }: { t: Translator; format: Formatters }) {
  const rows = [...SLOT_SYMBOLS].sort(
    (a, b) => SLOT_TRIPLE_MULTIPLIER[a] - SLOT_TRIPLE_MULTIPLIER[b],
  );

  return (
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
              {t("slots.paytable.chance", {
                n: format.number(Math.round(1 / tripleChance(symbol))),
              })}
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
            {t("slots.paytable.chance", {
              n: format.number(Math.round(1 / pairCherryChance())),
            })}
          </Text>
          <Text variant="body-strong-m" className={styles.payMultiplier}>
            {t("slots.paytable.pays", {
              multiplier: format.number(SLOT_PAIR_CHERRY_MULTIPLIER),
            })}
          </Text>
        </div>
      </Column>

      <Column gap="8">
        <Row gap="8" vertical="start">
          <Text variant="body-default-s">
            {t("slots.paytable.returnLine", {
              rtp: format.number(theoreticalReturn() * 100, { maximumFractionDigits: 1 }),
            })}
          </Text>
        </Row>
        <Text variant="body-default-s" onBackground="neutral-weak">
          {t("slots.paytable.hitLine", { n: format.number(Math.round(1 / hitChance())) })}
        </Text>
        <Text variant="body-default-s" onBackground="neutral-weak">
          {t("slots.paytable.fairLine")}
        </Text>
      </Column>
    </Column>
  );
}
