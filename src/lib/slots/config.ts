/**
 * The slot machine's rules. Safe to import from client components: nothing here is secret,
 * the pay table is shown to the player. The random draw itself lives in `engine.ts`.
 *
 * Virtual server currency only. Nothing here can be bought, deposited or withdrawn.
 */

export const SLOT_SYMBOLS = [
  "cherry",
  "lemon",
  "bell",
  "clover",
  "star",
  "diamond",
  "seven",
] as const;

export type SlotSymbol = (typeof SLOT_SYMBOLS)[number];

/** Relative chance of a symbol on one reel; the weights add up to 100. */
export const SLOT_WEIGHTS: Record<SlotSymbol, number> = {
  cherry: 30,
  lemon: 24,
  bell: 18,
  clover: 13,
  star: 8,
  diamond: 5,
  seven: 2,
};

/** What three of a kind pay, as a multiple of the bet. */
export const SLOT_TRIPLE_MULTIPLIER: Record<SlotSymbol, number> = {
  cherry: 7,
  lemon: 12,
  bell: 22,
  clover: 40,
  star: 100,
  diamond: 250,
  seven: 1000,
};

/** Exactly two cherries (in any place) pay a small consolation. */
export const SLOT_PAIR_CHERRY_MULTIPLIER = 1.5;

export const SLOT_REELS = 3;

/** Bounds the dashboard and the bot enforce on the per-server settings. */
export const SLOT_LIMITS = {
  /** Highest value the maximum bet can be set to. */
  maxBet: 100_000,
  /** Longest pause between two spins, in seconds. */
  maxCooldown: 3600,
} as const;

/** Largest value the `wallet` column (a 32-bit integer) can hold. */
export const INT32_MAX = 2_147_483_647;

/** Ask for a break after this many spins in one visit. */
export const BREAK_REMINDER_EVERY = 25;

export type SlotOutcome = "triple" | "pair" | "none";

export interface SlotResult {
  outcome: SlotOutcome;
  /** Multiple of the bet that is paid out, 0 for a loss. */
  multiplier: number;
  /** Coins paid out in total, the bet is already spent. Whole coins, rounded down. */
  payout: number;
  /** Indexes of the reels that make up the win, empty for a loss. */
  winning: number[];
}

/** The multiple of the bet and the winning reels for the three symbols that stopped. */
export function evaluateReels(reels: readonly SlotSymbol[]): Omit<SlotResult, "payout"> {
  const [a, b, c] = reels;
  if (a === b && b === c) {
    return { outcome: "triple", multiplier: SLOT_TRIPLE_MULTIPLIER[a], winning: [0, 1, 2] };
  }
  const cherries = reels.flatMap((symbol, index) => (symbol === "cherry" ? [index] : []));
  if (cherries.length === 2) {
    return { outcome: "pair", multiplier: SLOT_PAIR_CHERRY_MULTIPLIER, winning: cherries };
  }
  return { outcome: "none", multiplier: 0, winning: [] };
}

export function resolveSpin(reels: readonly SlotSymbol[], bet: number): SlotResult {
  const base = evaluateReels(reels);
  return { ...base, payout: Math.floor(bet * base.multiplier) };
}

const TOTAL_WEIGHT = SLOT_SYMBOLS.reduce((sum, symbol) => sum + SLOT_WEIGHTS[symbol], 0);

/** Chance that one reel shows the symbol, 0..1. */
export function symbolChance(symbol: SlotSymbol): number {
  return SLOT_WEIGHTS[symbol] / TOTAL_WEIGHT;
}

/** Chance of three of a kind of the symbol, 0..1. */
export function tripleChance(symbol: SlotSymbol): number {
  return symbolChance(symbol) ** 3;
}

/** Chance of exactly two cherries, 0..1. */
export function pairCherryChance(): number {
  const p = symbolChance("cherry");
  return 3 * p * p * (1 - p);
}

/**
 * What the machine pays back over a very long time, per coin bet (0.945 = 94.5%).
 * Worked out by going through every combination, so the pay table can never drift from it.
 */
export function theoreticalReturn(): number {
  let total = 0;
  for (const a of SLOT_SYMBOLS) {
    for (const b of SLOT_SYMBOLS) {
      for (const c of SLOT_SYMBOLS) {
        const chance = symbolChance(a) * symbolChance(b) * symbolChance(c);
        total += chance * evaluateReels([a, b, c]).multiplier;
      }
    }
  }
  return total;
}

/** Chance that a spin pays anything, 0..1. */
export function hitChance(): number {
  let total = 0;
  for (const a of SLOT_SYMBOLS) {
    for (const b of SLOT_SYMBOLS) {
      for (const c of SLOT_SYMBOLS) {
        const chance = symbolChance(a) * symbolChance(b) * symbolChance(c);
        if (evaluateReels([a, b, c]).multiplier > 0) total += chance;
      }
    }
  }
  return total;
}
