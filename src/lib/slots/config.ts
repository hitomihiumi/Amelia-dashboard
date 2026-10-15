/**
 * The slot machine's rules. Safe to import from client components: nothing here is secret,
 * the pay table is shown to the player. The random draw itself lives in `engine.ts`.
 *
 * Virtual server currency only. Nothing here can be bought, deposited or withdrawn.
 *
 * The machine is a grid of 3 reels × 3 rows. A *payline* is a path over the grid with one cell
 * on every reel; the player picks how many of the 9 lines are in play and bets on each of them.
 * Every cell is drawn on its own. The *scatter* pays nothing on a line, but three or more of
 * them anywhere on the grid start free spins.
 */

export const SLOT_SYMBOLS = [
  "cherry",
  "lemon",
  "bell",
  "clover",
  "star",
  "diamond",
  "seven",
  "scatter",
] as const;

export type SlotSymbol = (typeof SLOT_SYMBOLS)[number];

/** Symbols that make a winning line. The scatter is not one of them. */
export const LINE_SYMBOLS = SLOT_SYMBOLS.filter(
  (symbol): symbol is Exclude<SlotSymbol, "scatter"> => symbol !== "scatter",
);

/** Relative chance of a symbol in one cell; the weights add up to 106. */
export const SLOT_WEIGHTS: Record<SlotSymbol, number> = {
  cherry: 30,
  lemon: 24,
  bell: 18,
  clover: 13,
  star: 8,
  diamond: 5,
  seven: 2,
  scatter: 6,
};

/** What three of a kind on a line pay, as a multiple of the bet on that line. */
export const SLOT_TRIPLE_MULTIPLIER: Record<Exclude<SlotSymbol, "scatter">, number> = {
  cherry: 7,
  lemon: 11,
  bell: 20,
  clover: 36,
  star: 90,
  diamond: 220,
  seven: 1000,
};

/** Exactly two cherries on a line pay a small consolation. */
export const SLOT_PAIR_CHERRY_MULTIPLIER = 1.5;

export const SLOT_REELS = 3;
export const SLOT_ROWS = 3;

/**
 * The nine paylines: for every reel the row it passes through (0 is the top row). The player
 * plays the first 1, 3, 5 or 9 of them.
 */
export const PAYLINES: readonly (readonly [number, number, number])[] = [
  [1, 1, 1],
  [0, 0, 0],
  [2, 2, 2],
  [0, 1, 2],
  [2, 1, 0],
  [0, 1, 0],
  [2, 1, 2],
  [1, 0, 1],
  [1, 2, 1],
];

/** The line modes the player can pick between. */
export const LINE_MODES = [1, 3, 5, 9] as const;
export type LineMode = (typeof LINE_MODES)[number];

export function isLineMode(value: unknown): value is LineMode {
  return typeof value === "number" && (LINE_MODES as readonly number[]).includes(value);
}

/** Free spins: how many three, four, five or more scatters give. */
export function freeSpinsFor(scatters: number): number {
  if (scatters < 3) return 0;
  if (scatters === 3) return 8;
  if (scatters === 4) return 10;
  if (scatters === 5) return 12;
  return 15;
}

/** Wins of a free spin are paid at this multiple. Free spins cost nothing and can be won again. */
export const FREE_SPIN_WIN_MULTIPLIER = 2;

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

/** What the reels stopped on: `grid[reel][row]`. */
export type SlotGrid = SlotSymbol[][];

export type LineOutcome = "triple" | "pair";

export interface LineWin {
  /** Index into `PAYLINES`. */
  line: number;
  outcome: LineOutcome;
  /** The symbol of three of a kind, `cherry` for the pair. */
  symbol: Exclude<SlotSymbol, "scatter">;
  multiplier: number;
  /** Coins this line pays, already with the free spin multiplier. */
  payout: number;
  /** Reels whose cell on the line is part of the win. */
  reels: number[];
}

export interface SpinEvaluation {
  wins: LineWin[];
  /** Coins paid by all lines together. */
  payout: number;
  /** Scatters on the grid. */
  scatters: number;
  /** Free spins this grid awards. */
  freeSpinsAwarded: number;
  /** Cells that are part of a win, as `[reel, row]`, for the highlight. */
  cells: [number, number][];
}

/** The multiple of the line bet and the reels that make up the win, or `null` for no win. */
export function evaluateLine(
  symbols: readonly SlotSymbol[],
): {
  outcome: LineOutcome;
  symbol: Exclude<SlotSymbol, "scatter">;
  multiplier: number;
  reels: number[];
} | null {
  const [a, b, c] = symbols;
  if (a === b && b === c && a !== "scatter") {
    return {
      outcome: "triple",
      symbol: a,
      multiplier: SLOT_TRIPLE_MULTIPLIER[a],
      reels: [0, 1, 2],
    };
  }
  const cherries = symbols.flatMap((symbol, index) => (symbol === "cherry" ? [index] : []));
  if (cherries.length === 2) {
    return {
      outcome: "pair",
      symbol: "cherry",
      multiplier: SLOT_PAIR_CHERRY_MULTIPLIER,
      reels: cherries,
    };
  }
  return null;
}

/**
 * Works out a whole spin. `perLine` is the bet on one line, `lines` how many lines are played;
 * `free` marks a free spin, which pays at `FREE_SPIN_WIN_MULTIPLIER`.
 */
export function evaluateGrid(
  grid: SlotGrid,
  perLine: number,
  lines: number,
  free = false,
): SpinEvaluation {
  const factor = free ? FREE_SPIN_WIN_MULTIPLIER : 1;
  const wins: LineWin[] = [];
  const cells = new Map<string, [number, number]>();

  for (let line = 0; line < lines; line++) {
    const path = PAYLINES[line];
    const found = evaluateLine(path.map((row, reel) => grid[reel][row]));
    if (!found) continue;
    wins.push({
      line,
      outcome: found.outcome,
      symbol: found.symbol,
      multiplier: found.multiplier,
      payout: Math.floor(perLine * found.multiplier * factor),
      reels: found.reels,
    });
    for (const reel of found.reels) cells.set(`${reel}:${path[reel]}`, [reel, path[reel]]);
  }

  const scatters = grid.flat().filter((symbol) => symbol === "scatter").length;
  return {
    wins,
    payout: wins.reduce((sum, win) => sum + win.payout, 0),
    scatters,
    freeSpinsAwarded: freeSpinsFor(scatters),
    cells: [...cells.values()],
  };
}

const TOTAL_WEIGHT = SLOT_SYMBOLS.reduce((sum, symbol) => sum + SLOT_WEIGHTS[symbol], 0);

/** Chance that one cell shows the symbol, 0..1. */
export function symbolChance(symbol: SlotSymbol): number {
  return SLOT_WEIGHTS[symbol] / TOTAL_WEIGHT;
}

/** Chance of three of a kind of the symbol on one line, 0..1. */
export function tripleChance(symbol: SlotSymbol): number {
  return symbolChance(symbol) ** 3;
}

/** Chance of exactly two cherries on one line, 0..1. */
export function pairCherryChance(): number {
  const p = symbolChance("cherry");
  return 3 * p * p * (1 - p);
}

/** What one line pays per coin bet on it, over a very long time, without free spins. */
export function lineReturn(): number {
  let total = 0;
  for (const a of SLOT_SYMBOLS) {
    for (const b of SLOT_SYMBOLS) {
      for (const c of SLOT_SYMBOLS) {
        const chance = symbolChance(a) * symbolChance(b) * symbolChance(c);
        total += chance * (evaluateLine([a, b, c])?.multiplier ?? 0);
      }
    }
  }
  return total;
}

/** Chance that one line pays anything, 0..1. */
export function lineHitChance(): number {
  let total = 0;
  for (const a of SLOT_SYMBOLS) {
    for (const b of SLOT_SYMBOLS) {
      for (const c of SLOT_SYMBOLS) {
        if (evaluateLine([a, b, c])) {
          total += symbolChance(a) * symbolChance(b) * symbolChance(c);
        }
      }
    }
  }
  return total;
}

/** Binomial coefficient, for the scatter odds. */
function choose(n: number, k: number): number {
  let result = 1;
  for (let i = 1; i <= k; i++) result = (result * (n - k + i)) / i;
  return result;
}

/** Chance that a spin starts free spins (three or more scatters on the 9 cells), 0..1. */
export function freeSpinChance(): number {
  const cells = SLOT_REELS * SLOT_ROWS;
  const p = symbolChance("scatter");
  let total = 0;
  for (let k = 3; k <= cells; k++) total += choose(cells, k) * p ** k * (1 - p) ** (cells - k);
  return total;
}

/** Free spins a single spin is worth on average. */
function expectedFreeSpins(): number {
  const cells = SLOT_REELS * SLOT_ROWS;
  const p = symbolChance("scatter");
  let total = 0;
  for (let k = 3; k <= cells; k++) {
    total += choose(cells, k) * p ** k * (1 - p) ** (cells - k) * freeSpinsFor(k);
  }
  return total;
}

/**
 * What the machine pays back over a very long time, per coin bet (0.943 = 94.3%), free spins
 * included. The lines are independent of each other, so it does not depend on how many are played.
 */
export function theoreticalReturn(): number {
  const base = lineReturn();
  const spins = expectedFreeSpins();
  // Free spins can be won again, so each spin is worth `spins / (1 - spins)` free spins in the end.
  return base * (1 + (FREE_SPIN_WIN_MULTIPLIER * spins) / (1 - spins));
}
