import "server-only";
import { randomInt } from "node:crypto";
import {
  type ReelCount,
  SLOT_ROWS,
  SLOT_SYMBOLS,
  type SlotGrid,
  type SlotSymbol,
  weightsFor,
} from "./config";

/** One cell, drawn with the operating system's secure random numbers and the symbol weights. */
function drawSymbol(weights: Record<SlotSymbol, number>, total: number): SlotSymbol {
  let roll = randomInt(total);
  for (const symbol of SLOT_SYMBOLS) {
    roll -= weights[symbol];
    if (roll < 0) return symbol;
  }
  // Unreachable: the weights add up to `total`.
  return SLOT_SYMBOLS[0];
}

/** The symbols the reels stop on, `grid[reel][row]`. Every cell is independent of all others. */
export function drawGrid(reels: ReelCount): SlotGrid {
  const weights = weightsFor(reels);
  const total = SLOT_SYMBOLS.reduce((sum, symbol) => sum + weights[symbol], 0);
  return Array.from({ length: reels }, () =>
    Array.from({ length: SLOT_ROWS }, () => drawSymbol(weights, total)),
  );
}
