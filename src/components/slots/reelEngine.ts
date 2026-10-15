import type { SlotSymbol } from "@/lib/slots/config";

/** Cells in the loop of one reel. A reel is a circle of this many symbols. */
export const STRIP_LENGTH = 16;

/**
 * What each reel shows while it turns. This is only for looks: the symbols the reels stop on come
 * from the server and are put on the strip right before the reel lands. Every reel holds each symbol
 * twice, in an order of its own.
 */
export const REEL_STRIPS: SlotSymbol[][] = [
  [
    "cherry",
    "lemon",
    "bell",
    "scatter",
    "clover",
    "star",
    "cherry",
    "diamond",
    "lemon",
    "seven",
    "bell",
    "cherry",
    "clover",
    "lemon",
    "star",
    "scatter",
  ],
  [
    "lemon",
    "cherry",
    "clover",
    "bell",
    "diamond",
    "cherry",
    "scatter",
    "lemon",
    "star",
    "cherry",
    "bell",
    "seven",
    "lemon",
    "clover",
    "scatter",
    "star",
  ],
  [
    "bell",
    "cherry",
    "star",
    "lemon",
    "scatter",
    "clover",
    "cherry",
    "seven",
    "lemon",
    "bell",
    "cherry",
    "scatter",
    "diamond",
    "lemon",
    "clover",
    "star",
  ],
];

/** The strip index a position stands on, always in `0 ..< STRIP_LENGTH`. */
export function wrap(position: number): number {
  return ((position % STRIP_LENGTH) + STRIP_LENGTH) % STRIP_LENGTH;
}

/** Cells per second while a reel runs at full speed. */
const CRUISE_SPEED = 15;
/** Seconds a reel needs to get from standing still to full speed. */
const RAMP_UP = 0.25;
/** The reel dips this far past its symbol and settles back, in cells. */
const OVERSHOOT = 0.14;
const SETTLE_SECONDS = 0.18;

type Mode = "idle" | "spin" | "land" | "settle";

interface ReelState {
  pos: number;
  speed: number;
  mode: Mode;
  landAt: number | null;
  /** Where the reel comes to rest, an absolute position that is a whole number. */
  rest: number;
  quick: boolean;
  from: number;
  to: number;
  startedAt: number;
  duration: number;
}

/** Where a reel will be after `seconds` when it runs from `speed` up to full speed and on. */
function distanceAfter(speed: number, seconds: number): number {
  const accel = CRUISE_SPEED / RAMP_UP;
  const rampTime = Math.min(seconds, Math.max(0, (CRUISE_SPEED - speed) / accel));
  const ramp = speed * rampTime + 0.5 * accel * rampTime * rampTime;
  return ramp + CRUISE_SPEED * (seconds - rampTime);
}

export interface StopOptions {
  /** Shorter run and landing, for people who want it fast or prefer less motion. */
  quick: boolean;
}

/** What the engine tells the page about the landing it has planned for one reel. */
export interface LandingPlan {
  /** Strip index the reel will rest on (the symbol of the middle row). */
  index: number;
}

/** Called every frame a reel moves; `offset` is the position inside the loop in cells. */
export type FrameHandler = (reel: number, offset: number) => void;

/**
 * Moves the reels. A reel's position is a number of cells: the whole part is the symbol of the strip
 * that sits on the middle row, the fraction how far the strip has slid down towards the next one.
 *
 * Nothing in here touches React: the page hands over a callback that moves the strips with a
 * transform. A reel turns at a steady speed until `stop` is called, then it brakes steadily (no long
 * crawl at the end, it starts at the speed it was running at, so there is no jolt), dips a little
 * past its symbol and settles back.
 */
export class ReelEngine {
  private reels: ReelState[];
  private frame = 0;
  private lastTime = 0;
  private waiters: Array<() => void> = [];

  constructor(
    reelCount: number,
    private readonly onFrame: FrameHandler,
    initial: number[] = [],
  ) {
    this.reels = Array.from({ length: reelCount }, (_, index) => ({
      pos: initial[index] ?? 0,
      speed: 0,
      mode: "idle",
      landAt: null,
      rest: 0,
      quick: false,
      from: 0,
      to: 0,
      startedAt: 0,
      duration: 0,
    }));
  }

  /** Move every reel to a standing position without animating, for the first paint. */
  place(positions: number[]): void {
    positions.forEach((position, index) => {
      this.reels[index].pos = position;
      this.onFrame(index, wrap(position));
    });
  }

  start(): void {
    for (const reel of this.reels) {
      reel.mode = "spin";
      reel.landAt = null;
      reel.speed = 0;
    }
    this.run();
  }

  /**
   * Plan the landing of every reel and start it. `onPlan` gets the strip index each reel will rest on,
   * so the page can put the symbols the server drew on the strip before the reel gets there.
   */
  stop(
    { quick }: StopOptions,
    minRunMs: number,
    onPlan: (plans: LandingPlan[]) => void,
  ): Promise<void> {
    const now = performance.now();
    const stagger = quick ? 90 : 330;
    const travel = quick ? 6 : 8;

    const plans = this.reels.map((reel, index) => {
      const delay = (minRunMs + stagger * index) / 1000;
      // Where the reel is when it starts to land, then a fixed run of braking.
      const ahead = distanceAfter(reel.mode === "spin" ? reel.speed : 0, delay);
      const rest = Math.ceil(reel.pos + ahead + travel);
      reel.rest = rest;
      reel.quick = quick;
      reel.landAt = now + delay * 1000;
      return { index: wrap(rest) };
    });

    onPlan(plans);
    this.run();
    return new Promise((resolve) => this.waiters.push(resolve));
  }

  /** The spin could not be played (an error): brake the reels where they are, quickly. */
  abort(): Promise<void> {
    const now = performance.now();
    this.reels.forEach((reel) => {
      if (reel.mode === "idle") return;
      reel.quick = true;
      reel.rest = Math.ceil(reel.pos + 3);
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

  private beginLanding(reel: ReelState, now: number): void {
    const target = reel.rest + OVERSHOOT;
    const distance = Math.max(2, target - reel.pos);
    const speed = Math.max(reel.speed, 4);
    reel.mode = "land";
    reel.from = reel.pos;
    reel.to = reel.pos + distance;
    reel.startedAt = now;
    // Braking at a steady rate: the speed at the start is 2 * distance / duration, so the duration that
    // makes it equal to the speed the reel already has is 2 * distance / speed.
    reel.duration = (2 * distance) / speed;
    // The distance is stretched or squeezed a little to end exactly on the symbol.
    reel.to = target;
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
        if (reel.landAt !== null && now >= reel.landAt) this.beginLanding(reel, now);
      } else if (reel.mode === "land") {
        const t = Math.min(1, (now - reel.startedAt) / (reel.duration * 1000));
        // Ease out: a constant braking.
        reel.pos = reel.from + (reel.to - reel.from) * (1 - (1 - t) ** 2);
        reel.speed = (2 * (reel.to - reel.from) * (1 - t)) / reel.duration;
        if (t >= 1) {
          reel.mode = "settle";
          reel.from = reel.pos;
          reel.startedAt = now;
          reel.speed = 0;
        }
      } else {
        const t = Math.min(1, (now - reel.startedAt) / (SETTLE_SECONDS * 1000));
        const eased = 0.5 - 0.5 * Math.cos(Math.PI * t);
        reel.pos = reel.from + (reel.rest - reel.from) * eased;
        if (t >= 1) {
          reel.pos = reel.rest;
          reel.mode = "idle";
          reel.landAt = null;
        }
      }

      this.onFrame(index, wrap(reel.pos));
    });

    if (busy) {
      this.frame = requestAnimationFrame(this.tick);
    } else {
      this.frame = 0;
      this.waiters.splice(0).forEach((resolve) => resolve());
    }
  };
}
