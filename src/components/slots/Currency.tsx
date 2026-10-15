import styles from "./SlotMachine.module.scss";
import { CoinIcon } from "./symbols";

export interface SlotsCurrency {
  emoji: string | null;
  id: string | null;
}

const CUSTOM_EMOJI = /^<(a?):([^:>]+):(\d{15,25})>$/;

/**
 * The currency sign of a server: its custom emoji, a Unicode emoji, or a plain coin when the
 * server never picked one.
 */
export function Currency({ currency }: { currency: SlotsCurrency }) {
  const emoji = currency.emoji?.trim();
  if (emoji) {
    const custom = CUSTOM_EMOJI.exec(emoji);
    if (custom) {
      const [, animated, , id] = custom;
      return (
        // A plain <img>: the picture comes straight from Discord's CDN and is a few pixels big.
        <img
          src={`https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "webp"}?size=64&quality=lossless`}
          alt=""
          className={styles.currencyImage}
          loading="lazy"
        />
      );
    }
    if (!emoji.includes(":")) {
      return <span aria-hidden="true">{emoji}</span>;
    }
  }
  return <CoinIcon className={styles.coin} />;
}
