import "server-only";
import { randomInt } from "node:crypto";
import {
  SLOT_REELS,
  SLOT_ROWS,
  SLOT_SYMBOLS,
  SLOT_WEIGHTS,
  type SlotGrid,
  type SlotSymbol,
} from "./config";

const TOTAL_WEIGHT = SLOT_SYMBOLS.reduce((sum, symbol) => sum + SLOT_WEIGHTS[symbol], 0);

/** One cell, drawn with the operating system's secure random numbers and the symbol weights. */
function drawSymbol(): SlotSymbol {
  let roll = randomInt(TOTAL_WEIGHT);
  for (const symbol of SLOT_SYMBOLS) {
    roll -= SLOT_WEIGHTS[symbol];
    if (roll < 0) return symbol;
  }
  // Unreachable: the weights add up to TOTAL_WEIGHT.
  return SLOT_SYMBOLS[0];
}

/** The symbols the reels stop on, `grid[reel][row]`. Every cell is independent of all others. */
export function drawGrid(): SlotGrid {
  return Array.from({ length: SLOT_REELS }, () => Array.from({ length: SLOT_ROWS }, drawSymbol));
}
