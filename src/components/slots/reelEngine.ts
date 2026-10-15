import type { SlotSymbol } from "@/lib/slots/config";

/**
 * What each reel shows while it turns. This is only for looks: the symbols the reels stop on
 * come from the server, the strip is moved until the wanted symbol sits on the payline.
 * Every strip has 24 symbols and the same mix, close to the real chances.
 */
export const REEL_STRIPS: SlotSymbol[][] = [
  [
    "cherry",
    "lemon",
    "bell",
    "cherry",
    "clover",
    "lemon",
    "star",
    "cherry",
    "bell",
    "lemon",
    "cherry",
    "seven",
    "lemon",
    "bell",
    "clover",
    "cherry",
    "lemon",
    "diamond",
    "cherry",
    "bell",
    "star",
    "cherry",
    "lemon",
    "clover",
  ],
  [
    "lemon",
    "cherry",
    "clover",
    "bell",
    "cherry",
    "lemon",
    "diamond",
    "cherry",
    "star",
    "bell",
    "lemon",
    "cherry",
    "clover",
    "lemon",
    "bell",
    "cherry",
    "seven",
    "lemon",
    "cherry",
    "star",
    "bell",
    "cherry",
    "lemon",
    "clover",
  ],
  [
    "bell",
    "cherry",
    "lemon",
    "star",
    "cherry",
    "clover",
    "lemon",
    "bell",
    "cherry",
    "seven",
    "lemon",
    "cherry",
    "bell",
    "clover",
    "cherry",
    "lemon",
    "diamond",
    "cherry",
    "star",
    "lemon",
    "bell",
    "clover",
    "cherry",
    "lemon",
  ],
];

/** Symbol on the payline when a reel stands at `pos` (a whole number). */
export function symbolAt(strip: readonly SlotSymbol[], index: number): SlotSymbol {
  const length = strip.length;
  return strip[((index % length) + length) % length];
}

/** Cells per second while a reel runs at full speed. */
const CRUISE_SPEED = 16;
/** Seconds a reel needs to get from standing still to full speed. */
const RAMP_UP = 0.28;
/** Overshoot of the landing: the reel dips a little past the symbol and settles back. */
const OVERSHOOT = 0.45;
/** Speed of the landing at its very start, in units of (distance / duration). */
const LAND_SLOPE = OVERSHOOT + 3;

const easeOutBack = (t: number) => {
  const c3 = OVERSHOOT + 1;
  return 1 + c3 * (t - 1) ** 3 + OVERSHOOT * (t - 1) ** 2;
};

type Mode = "idle" | "spin" | "land";

interface ReelState {
  pos: number;
  speed: number;
  mode: Mode;
  /** While spinning: when to start landing, `null` until `stop()` has been called. */
  landAt: number | null;
  target: SlotSymbol | null;
  quick: boolean;
  from: number;
  to: number;
  startedAt: number;
  duration: number;
}

export interface StopOptions {
  /** Shorter run and landing, for people who want it fast or prefer less motion. */
  quick: boolean;
}

export type FrameHandler = (reel: number, pos: number, speed: number) => void;

/**
 * Moves the reels. A reel's position is a number of cells: the whole part says which symbol of the
 * strip is on the payline, the fraction how far it has slid down towards the next one.
 *
 * It spins at a steady speed until `stop` is called, then each reel in turn glides into a
 * landing on the symbol it was told to show, starting at the speed it was running at so there is
 * no jolt. The promise of `stop` resolves once the last reel stands still.
 */
export class ReelEngine {
  private reels: ReelState[];
  private frame = 0;
  private lastTime = 0;
  private waiters: Array<() => void> = [];

  constructor(
    private readonly strips: readonly (readonly SlotSymbol[])[],
    private readonly onFrame: FrameHandler,
    initial: number[] = [],
  ) {
    this.reels = strips.map((_, index) => ({
      pos: initial[index] ?? 0,
      speed: 0,
      mode: "idle",
      landAt: null,
      target: null,
      quick: false,
      from: 0,
      to: 0,
      startedAt: 0,
      duration: 0,
    }));
  }

  position(reel: number): number {
    return this.reels[reel].pos;
  }

  /** Every reel starts turning, one after the other a hair apart. */
  start(): void {
    for (const reel of this.reels) {
      reel.mode = "spin";
      reel.landAt = null;
      reel.target = null;
      reel.speed = 0;
    }
    this.run();
  }

  /**
   * Land the reels on `targets` (the symbol each reel shows on the payline). `minRun` is how many
   * milliseconds the reels have to run before the first one starts to land.
   */
  stop(targets: readonly SlotSymbol[], { quick }: StopOptions, minRunMs = 0): Promise<void> {
    const now = performance.now();
    const stagger = quick ? 110 : 380;
    this.reels.forEach((reel, index) => {
      reel.target = targets[index];
      reel.quick = quick;
      reel.landAt = now + minRunMs + stagger * index;
    });
    this.run();
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  /** The spin could not be played (an error): settle the reels where they are, quickly. */
  abort(): Promise<void> {
    const now = performance.now();
    this.reels.forEach((reel) => {
      if (reel.mode === "idle") return;
      reel.target = null;
      reel.quick = true;
      reel.landAt = now;
    });
    this.run();
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  dispose(): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.waiters.splice(0).forEach((resolve) => resolve());
  }

  private run(): void {
    if (this.frame) return;
    this.lastTime = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  private beginLanding(index: number, now: number): void {
    const reel = this.reels[index];
    const strip = this.strips[index];
    const minTravel = reel.quick ? 3 : 7 + index;

    let to = Math.ceil(reel.pos + minTravel);
    if (reel.target) {
      // The first spot in front of the reel that shows the wanted symbol.
      for (let step = 0; step < strip.length; step++) {
        if (symbolAt(strip, to + step) === reel.target) {
          to += step;
          break;
        }
      }
    }

    const distance = to - reel.pos;
    const speed = Math.max(reel.speed, 4);
    reel.mode = "land";
    reel.from = reel.pos;
    reel.to = to;
    reel.startedAt = now;
    // Starting speed of the easing is LAND_SLOPE * distance / duration; make it the current speed.
    reel.duration = Math.max(0.35, (LAND_SLOPE * distance) / speed);
  }

  private tick = (now: number): void => {
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;
    let busy = false;

    this.reels.forEach((reel, index) => {
      if (reel.mode === "idle") return;
      busy = true;

      if (reel.mode === "spin") {
        reel.speed = Math.min(CRUISE_SPEED, reel.speed + (CRUISE_SPEED / RAMP_UP) * dt);
        reel.pos += reel.speed * dt;
        if (reel.landAt !== null && now >= reel.landAt) this.beginLanding(index, now);
      } else {
        const t = Math.min(1, (now - reel.startedAt) / (reel.duration * 1000));
        const next = t >= 1 ? reel.to : reel.from + (reel.to - reel.from) * easeOutBack(t);
        reel.speed = dt > 0 ? Math.abs(next - reel.pos) / dt : reel.speed;
        reel.pos = next;
        if (t >= 1) {
          reel.mode = "idle";
          reel.speed = 0;
        }
      }

      this.onFrame(index, reel.pos, reel.speed);
    });

    if (busy) {
      this.frame = requestAnimationFrame(this.tick);
    } else {
      this.frame = 0;
      this.waiters.splice(0).forEach((resolve) => resolve());
    }
  };
}
