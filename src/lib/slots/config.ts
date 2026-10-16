/**
 * The slot machine's rules. Safe to import from client components: nothing here is secret,
 * the pay table is shown to the player. The random draw itself lives in `engine.ts`.
 *
 * Virtual server currency only. Nothing here can be bought, deposited or withdrawn.
 *
 * The machine is a grid of 3, 4 or 5 reels × 3 rows. A *payline* is a path over the grid with one
 * cell on every reel; the player picks how many of the 9 lines are in play and bets on each of them.
 * A line pays when the same symbol stands on it three or more times in a row from the left reel.
 * Every cell is drawn on its own. The *scatter* pays nothing on a line, but enough of them anywhere
 * on the grid start free spins.
 *
 * Each width has its own pay table and scatter odds, worked out so that the machine pays back about
 * the same (94.3%) whatever the width.
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
export type LineSymbol = Exclude<SlotSymbol, "scatter">;

/** Symbols that make a winning line. The scatter is not one of them. */
export const LINE_SYMBOLS = SLOT_SYMBOLS.filter(
  (symbol): symbol is LineSymbol => symbol !== "scatter",
);

/** Relative chance of a line symbol in one cell; the scatter's weight depends on the width. */
const LINE_WEIGHTS: Record<LineSymbol, number> = {
  cherry: 30,
  lemon: 24,
  bell: 18,
  clover: 13,
  star: 8,
  diamond: 5,
  seven: 2,
};

/** The widths of the machine. */
export const REEL_COUNTS = [3, 4, 5] as const;
export type ReelCount = (typeof REEL_COUNTS)[number];
export const MAX_REELS = 5;
export const SLOT_ROWS = 3;

export function isReelCount(value: unknown): value is ReelCount {
  return typeof value === "number" && (REEL_COUNTS as readonly number[]).includes(value);
}

interface WidthRules {
  /** Relative chance of the scatter in one cell. */
  scatterWeight: number;
  /** Scatters on the grid it takes to start free spins. */
  minScatters: number;
  /**
   * What a line pays as a multiple of the bet on it, for three, four and five symbols in a row
   * (only as many entries are used as the machine has reels).
   */
  pays: Record<LineSymbol, readonly [number, number, number]>;
}

const RULES: Record<ReelCount, WidthRules> = {
  3: {
    scatterWeight: 6,
    minScatters: 3,
    pays: {
      cherry: [7, 7, 7],
      lemon: [11, 11, 11],
      bell: [20, 20, 20],
      clover: [36, 36, 36],
      star: [90, 90, 90],
      diamond: [220, 220, 220],
      seven: [1000, 1000, 1000],
    },
  },
  4: {
    scatterWeight: 8,
    minScatters: 4,
    pays: {
      cherry: [6, 18, 18],
      lemon: [9, 27, 27],
      bell: [16, 48, 48],
      clover: [28, 84, 84],
      star: [71, 213, 213],
      diamond: [173, 519, 519],
      seven: [786, 2358, 2358],
    },
  },
  5: {
    scatterWeight: 6,
    minScatters: 4,
    pays: {
      cherry: [4, 12, 48],
      lemon: [7, 21, 84],
      bell: [12, 36, 144],
      clover: [22, 66, 264],
      star: [55, 165, 660],
      diamond: [133, 399, 1596],
      seven: [606, 1818, 7272],
    },
  },
};

/** Exactly two cherries among the first three cells of a line pay a small consolation. */
export const SLOT_PAIR_CHERRY_MULTIPLIER = 1.5;

/** The scatter's weight, the minimum scatters for free spins and the pay table of a width. */
export function rulesFor(reels: ReelCount): WidthRules {
  return RULES[reels];
}

/** Relative chance of every symbol in one cell at this width. */
export function weightsFor(reels: ReelCount): Record<SlotSymbol, number> {
  return { ...LINE_WEIGHTS, scatter: RULES[reels].scatterWeight };
}

/**
 * The nine paylines: for every reel the row it passes through (0 is the top row). The player plays
 * the first 1, 3, 5 or 9 of them, over as many reels as the machine has.
 */
export const PAYLINES: readonly (readonly number[])[] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 1, 0, 1, 0],
  [2, 1, 2, 1, 2],
  [1, 0, 1, 0, 1],
  [1, 2, 1, 2, 1],
];

/** The line modes the player can pick between. */
export const LINE_MODES = [1, 3, 5, 9] as const;
export type LineMode = (typeof LINE_MODES)[number];

export function isLineMode(value: unknown): value is LineMode {
  return typeof value === "number" && (LINE_MODES as readonly number[]).includes(value);
}

/**
 * Free spins: the first count that starts them gives 8, then 10, 12 and, with three more than the
 * minimum or beyond, 15.
 */
export function freeSpinsFor(reels: ReelCount, scatters: number): number {
  const over = scatters - RULES[reels].minScatters;
  if (over < 0) return 0;
  if (over === 0) return 8;
  if (over === 1) return 10;
  if (over === 2) return 12;
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

export type LineOutcome = "run" | "pair";

export interface LineWin {
  /** Index into `PAYLINES`. */
  line: number;
  outcome: LineOutcome;
  /** The symbol of the run, `cherry` for the pair. */
  symbol: LineSymbol;
  /** How many symbols in a row, 2 for the pair. */
  count: number;
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

/**
 * What one line pays: the symbols standing on it, left to right. `null` for no win. A run of the same
 * symbol from the left reel pays by its length; two cherries among the first three pay the consolation.
 */
export function evaluateLine(
  symbols: readonly SlotSymbol[],
  reels: ReelCount = symbols.length as ReelCount,
): Pick<LineWin, "outcome" | "symbol" | "count" | "multiplier" | "reels"> | null {
  const first = symbols[0];
  if (first !== "scatter") {
    let count = 1;
    while (count < symbols.length && symbols[count] === first) count++;
    if (count >= 3) {
      return {
        outcome: "run",
        symbol: first,
        count,
        multiplier: RULES[reels].pays[first][count - 3],
        reels: Array.from({ length: count }, (_, i) => i),
      };
    }
  }
  const cherries = symbols
    .slice(0, 3)
    .flatMap((symbol, index) => (symbol === "cherry" ? [index] : []));
  if (cherries.length === 2) {
    return {
      outcome: "pair",
      symbol: "cherry",
      count: 2,
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
  const reels = grid.length as ReelCount;
  const factor = free ? FREE_SPIN_WIN_MULTIPLIER : 1;
  const wins: LineWin[] = [];
  const cells = new Map<string, [number, number]>();

  for (let line = 0; line < lines; line++) {
    const path = PAYLINES[line];
    const found = evaluateLine(
      grid.map((column, reel) => column[path[reel]]),
      reels,
    );
    if (!found) continue;
    wins.push({
      line,
      ...found,
      payout: Math.floor(perLine * found.multiplier * factor),
    });
    for (const reel of found.reels) cells.set(`${reel}:${path[reel]}`, [reel, path[reel]]);
  }

  const scatters = grid.flat().filter((symbol) => symbol === "scatter").length;
  return {
    wins,
    payout: wins.reduce((sum, win) => sum + win.payout, 0),
    scatters,
    freeSpinsAwarded: freeSpinsFor(reels, scatters),
    cells: [...cells.values()],
  };
}

/** Chance that one cell shows the symbol at this width, 0..1. */
export function symbolChance(symbol: SlotSymbol, reels: ReelCount = 3): number {
  const weights = weightsFor(reels);
  const total = SLOT_SYMBOLS.reduce((sum, s) => sum + weights[s], 0);
  return weights[symbol] / total;
}

/** Chance that a line has exactly `count` of the symbol in a row from the left reel, 0..1. */
export function runChance(symbol: LineSymbol, count: number, reels: ReelCount = 3): number {
  const p = symbolChance(symbol, reels);
  return count < reels ? p ** count * (1 - p) : p ** count;
}

/** Chance of exactly two cherries among the first three cells of a line, 0..1. */
export function pairCherryChance(reels: ReelCount = 3): number {
  const p = symbolChance("cherry", reels);
  return 3 * p * p * (1 - p);
}

/** What one line pays per coin bet on it, over a very long time, without free spins. */
export function lineReturn(reels: ReelCount = 3): number {
  let total = pairCherryChance(reels) * SLOT_PAIR_CHERRY_MULTIPLIER;
  for (const symbol of LINE_SYMBOLS) {
    for (let count = 3; count <= reels; count++) {
      total += runChance(symbol, count, reels) * RULES[reels].pays[symbol][count - 3];
    }
  }
  return total;
}

/** Chance that one line pays anything, 0..1. */
export function lineHitChance(reels: ReelCount = 3): number {
  let total = pairCherryChance(reels);
  for (const symbol of LINE_SYMBOLS) total += symbolChance(symbol, reels) ** 3;
  return total;
}

/** Binomial coefficient, for the scatter odds. */
function choose(n: number, k: number): number {
  let result = 1;
  for (let i = 1; i <= k; i++) result = (result * (n - k + i)) / i;
  return result;
}

/** Chance that a spin has exactly `k` scatters on the grid, 0..1. */
function scatterCountChance(reels: ReelCount, k: number): number {
  const cells = reels * SLOT_ROWS;
  const p = symbolChance("scatter", reels);
  return choose(cells, k) * p ** k * (1 - p) ** (cells - k);
}

/** Chance that a spin starts free spins, 0..1. */
export function freeSpinChance(reels: ReelCount = 3): number {
  let total = 0;
  for (let k = RULES[reels].minScatters; k <= reels * SLOT_ROWS; k++) {
    total += scatterCountChance(reels, k);
  }
  return total;
}

/** Free spins a single spin is worth on average. */
function expectedFreeSpins(reels: ReelCount): number {
  let total = 0;
  for (let k = RULES[reels].minScatters; k <= reels * SLOT_ROWS; k++) {
    total += scatterCountChance(reels, k) * freeSpinsFor(reels, k);
  }
  return total;
}

/**
 * What the machine pays back over a very long time, per coin bet (0.943 = 94.3%), free spins
 * included. The lines are independent of each other, so it does not depend on how many are played.
 */
export function theoreticalReturn(reels: ReelCount = 3): number {
  const spins = expectedFreeSpins(reels);
  // Free spins can be won again, so each spin is worth `spins / (1 - spins)` free spins in the end.
  return lineReturn(reels) * (1 + (FREE_SPIN_WIN_MULTIPLIER * spins) / (1 - spins));
}
