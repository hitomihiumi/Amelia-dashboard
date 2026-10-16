"use client";

import { Button, Checkbox, Column, Row, Text } from "@once-ui-system/core";
import { useRouter } from "next/navigation";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type FreeSpinState,
  type SpinResponse,
  spinSlots,
} from "@/app/(main)/profile/slots/actions";
import { useFormat, useT } from "@/i18n/client";
import {
  BREAK_REMINDER_EVERY,
  LINE_MODES,
  type LineMode,
  type LineWin,
  MAX_REELS,
  PAYLINES,
  REEL_COUNTS,
  type ReelCount,
  isReelCount,
  type SlotGrid,
  type SlotSymbol,
} from "@/lib/slots/config";
import { Currency, type SlotsCurrency } from "./Currency";
import { LINE_COLORS, PayTable } from "./PayTable";
import { REEL_STRIPS, ReelEngine, STRIP_LENGTH, wrap } from "./reelEngine";
import { ResponsibleBanner, ResponsibleNotice } from "./Responsible";
import styles from "./SlotMachine.module.scss";
import { SlotSymbolDefs, SlotSymbolIcon } from "./symbols";

const ACK_KEY = "amelia:slots:ack:v1";
const QUICK_KEY = "amelia:slots:quick";
const LINES_KEY = "amelia:slots:lines";
const REELS_KEY = "amelia:slots:reels";
/** The width from which the machine can have more than three reels. */
const WIDE_QUERY = "(min-width: 980px)";
/** Where the reels stand before the first spin. */
const START_POSITIONS = [3, 8, 13, 5, 10];
/** The cells drawn per reel: the loop plus the ones around it, so the seam never shows. */
const NODES = Array.from({ length: STRIP_LENGTH + 4 }, (_, i) => i - 1);
const LIGHTS = Array.from({ length: 16 }, (_, i) => i);
/** One unit of the line drawing is a cell; this is the gap between two reels in cells. */
const GAP_RATIO = 0.09;
/** Width of the line drawing in cells: the reels and the gaps between them. */
const drawingWidth = (reels: number) => reels + (reels - 1) * GAP_RATIO;

type Phase = "idle" | "spin";
type Tone = "neutral" | "win" | "lose" | "error";
type Overlay =
  | { kind: "freeWon"; count: number }
  | { kind: "freeEnd"; total: number }
  | { kind: "break" }
  | null;

interface Screen {
  tone: Tone;
  main: string;
  sub?: string;
}

interface Coin {
  id: number;
  x: number;
  size: number;
  dur: number;
  delay: number;
  dx: number;
  rot: number;
}

export interface SlotMachineProps {
  guildId: string;
  min: number;
  max: number;
  /** Seconds between two spins. */
  cooldown: number;
  currency: SlotsCurrency;
  wallet: number;
  /** Milliseconds until the member may spin again, `0` when they already may. */
  cooldownLeftMs: number;
  /** Free spins the member has won and not played yet. */
  freeState: FreeSpinState | null;
}

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode or blocked storage: the choice simply is not remembered.
  }
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** A bet that is a bit bigger or smaller, in steps that fit its size (5, 50, 500, ...). */
function betStep(bet: number): number {
  if (bet < 10) return 1;
  return 5 * 10 ** (Math.floor(Math.log10(bet)) - 1);
}

function makeCoins(count: number): Coin[] {
  const base = Date.now();
  return Array.from({ length: count }, (_, i) => ({
    id: base + i,
    x: 10 + Math.random() * 80,
    size: 14 + Math.random() * 12,
    dur: 1.3 + Math.random() * 1.1,
    delay: Math.random() * 0.7,
    dx: (Math.random() - 0.5) * 160,
    rot: (Math.random() - 0.5) * 900,
  }));
}

/**
 * A number that counts up or down to its target. It keeps its own state, so the count does not
 * make the whole machine render again on every frame.
 */
const AnimatedAmount = memo(function AnimatedAmount({
  value,
  format,
}: {
  value: number;
  format: (value: number) => string;
}) {
  const [shown, setShown] = useState(value);
  const current = useRef(value);

  useEffect(() => {
    if (current.current === value) return;
    if (prefersReducedMotion()) {
      current.current = value;
      setShown(value);
      return;
    }
    const from = current.current;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 700);
      current.current = Math.round(from + (value - from) * (1 - (1 - t) ** 3));
      setShown(current.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{format(shown)}</>;
});

/** One cell of a reel. Memoised: when a landing changes three symbols, only those three render again. */
const Cell = memo(function Cell({ symbol, row }: { symbol: SlotSymbol; row: number }) {
  return (
    <div className={styles.cell} style={{ "--row": row } as React.CSSProperties}>
      <SlotSymbolIcon symbol={symbol} className={styles.symbol} />
    </div>
  );
});

/**
 * One reel: a loop of symbols that the engine slides with a transform. It only renders again when
 * the symbols of the landing change, never while the reel moves.
 */
const Reel = memo(function Reel({
  strip,
  overrides,
  start,
  label,
  setRef,
}: {
  strip: readonly SlotSymbol[];
  overrides: Record<number, SlotSymbol>;
  start: number;
  label: string;
  setRef: (el: HTMLDivElement | null) => void;
}) {
  return (
    <div className={styles.reel} role="img" aria-label={label}>
      <div
        className={styles.strip}
        ref={setRef}
        style={{ transform: `translate3d(0, ${start}%, 0)` }}
      >
        {NODES.map((node) => {
          const index = wrap(node);
          return <Cell key={node} symbol={overrides[index] ?? strip[index]} row={1 - node} />;
        })}
      </div>
    </div>
  );
});

/** The lines in play, drawn over the reels. */
const LinesOverlay = memo(function LinesOverlay({
  reels,
  lines,
  winLines,
  hidden,
}: {
  reels: number;
  lines: number;
  winLines: number[];
  hidden: boolean;
}) {
  const paths = useMemo(
    () =>
      PAYLINES.slice(0, lines).map((path, index) => {
        const points = path
          .slice(0, reels)
          .map((row, reel) => [reel * (1 + GAP_RATIO) + 0.5, row + 0.5]);
        const first = points[0];
        const last = points[points.length - 1];
        const all = [[0, first[1]], ...points, [drawingWidth(reels), last[1]]];
        return { index, d: all.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ") };
      }),
    [lines, reels],
  );

  return (
    <svg
      className={styles.lines}
      data-hidden={hidden}
      viewBox={`0 0 ${drawingWidth(reels)} 3`}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {paths.map(({ index, d }) => (
        <path
          key={index}
          d={d}
          className={styles.linePath}
          data-win={winLines.includes(index)}
          style={{ stroke: LINE_COLORS[index], color: LINE_COLORS[index] }}
        />
      ))}
    </svg>
  );
});

export function SlotMachine({
  guildId,
  min,
  max,
  cooldown,
  currency,
  wallet: initialWallet,
  cooldownLeftMs,
  freeState: initialFree,
}: SlotMachineProps) {
  const t = useT();
  const format = useFormat();
  const router = useRouter();
  const formatNumber = useCallback((value: number) => format.number(value), [format]);

  const [ack, setAck] = useState<"unknown" | "yes" | "no">("unknown");
  const [acknowledged, setAcknowledged] = useState(false);
  const [quick, setQuick] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [wallet, setWallet] = useState(initialWallet);
  const [lines, setLines] = useState<LineMode>(1);
  const [reelCount, setReelCount] = useState<ReelCount>(3);
  const [wide, setWide] = useState(false);
  const [freeState, setFreeState] = useState<FreeSpinState | null>(initialFree);
  const [perLine, setPerLine] = useState(() => Math.min(Math.max(min, 10), max));
  const [perLineText, setPerLineText] = useState(() => String(Math.min(Math.max(min, 10), max)));
  const [overrides, setOverrides] = useState<Record<number, SlotSymbol>[]>(
    Array.from({ length: MAX_REELS }, () => ({})),
  );
  const [grid, setGrid] = useState<SlotGrid | null>(null);
  const [wins, setWins] = useState<LineWin[]>([]);
  const [winCells, setWinCells] = useState<[number, number][]>([]);
  const [screen, setScreen] = useState<Screen>({ tone: "neutral", main: "" });
  const [win, setWin] = useState(false);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [stats, setStats] = useState({ spins: 0, wagered: 0, won: 0 });
  const [overlay, setOverlay] = useState<Overlay>(null);
  // Both start at 0 and are set after mounting, so the server and the browser render the same.
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(0);

  const stripRefs = useRef<(HTMLDivElement | null)[]>(
    Array.from({ length: MAX_REELS }, () => null),
  );
  const engineRef = useRef<ReelEngine | null>(null);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);
  const quickRef = useRef(quick);
  quickRef.current = quick;
  const reducedRef = useRef(false);
  const timers = useRef<number[]>([]);

  const refSetters = useMemo(
    () =>
      Array.from({ length: MAX_REELS }, (_, reel) => (el: HTMLDivElement | null) => {
        stripRefs.current[reel] = el;
      }),
    [],
  );

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(
      window.setTimeout(() => {
        if (mountedRef.current) fn();
      }, ms),
    );
  }, []);

  // ---- setup -------------------------------------------------------------------------------

  useEffect(() => {
    reducedRef.current = prefersReducedMotion();
    setAck(readStorage(ACK_KEY) === "yes" ? "yes" : "no");
    const stored = readStorage(QUICK_KEY);
    setQuick(stored === null ? reducedRef.current : stored === "1");
    const savedLines = Number(readStorage(LINES_KEY));
    if ((LINE_MODES as readonly number[]).includes(savedLines)) setLines(savedLines as LineMode);
    const savedReels = Number(readStorage(REELS_KEY));
    if (isReelCount(savedReels)) setReelCount(savedReels);
    if (cooldownLeftMs > 0) {
      setNow(Date.now());
      setCooldownUntil(Date.now() + cooldownLeftMs);
    }
    setScreen({
      tone: "neutral",
      main: initialFree ? t("slots.machine.freeLocked") : t("slots.machine.ready"),
    });
    // Only the state the page was opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // More than three reels are for wide screens.
  useEffect(() => {
    const query = window.matchMedia(WIDE_QUERY);
    setWide(query.matches);
    const onChange = (event: MediaQueryListEvent) => setWide(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // The engine moves the strips directly; React is not involved while a reel turns.
  useEffect(() => {
    mountedRef.current = true;
    const engine = new ReelEngine(
      MAX_REELS,
      (reel, offset) => {
        const el = stripRefs.current[reel];
        if (el) el.style.transform = `translate3d(0, ${offset.toFixed(3)}%, 0)`;
      },
      START_POSITIONS,
    );
    engineRef.current = engine;
    return () => {
      mountedRef.current = false;
      engine.dispose();
      engineRef.current = null;
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    };
  }, []);

  // Counts the pause between spins down on the button.
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    setNow(Date.now());
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= cooldownUntil) window.clearInterval(timer);
    }, 250);
    return () => window.clearInterval(timer);
  }, [cooldownUntil]);

  // ---- lines and bet -----------------------------------------------------------------------

  const range = useCallback(
    (mode: number) => ({ lo: Math.ceil(min / mode), hi: Math.floor(max / mode) }),
    [min, max],
  );
  const modeAvailable = (mode: number) => {
    const { lo, hi } = range(mode);
    return lo <= hi;
  };

  const inFree = freeState !== null;
  const activeLines = freeState ? freeState.lines : lines;
  const activeReels: ReelCount = freeState ? freeState.reels : wide ? reelCount : 3;
  const activePerLine = freeState ? freeState.perLine : perLine;
  const total = activePerLine * activeLines;
  const { lo: perMin, hi: perMax } = range(lines);

  const applyPerLine = useCallback(
    (value: number, mode: number = lines) => {
      const { lo, hi } = range(mode);
      const next = Math.min(hi, Math.max(lo, Math.round(value)));
      setPerLine(next);
      setPerLineText(String(next));
    },
    [lines, range],
  );

  const pickReels = (count: ReelCount) => {
    setReelCount(count);
    writeStorage(REELS_KEY, String(count));
  };

  const pickLines = (mode: LineMode) => {
    setLines(mode);
    writeStorage(LINES_KEY, String(mode));
    applyPerLine(perLine, mode);
  };

  const onBetInput = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 7);
    setPerLineText(digits);
    if (digits) setPerLine(Number(digits));
  };

  const betValid =
    Number.isInteger(perLine) && perLine >= perMin && perLine <= perMax && perMin <= perMax;
  const canAfford = inFree || wallet >= total;
  const secondsLeft = !inFree && cooldownUntil > now ? Math.ceil((cooldownUntil - now) / 1000) : 0;
  const locked = ack !== "yes";
  const canSpin =
    !locked &&
    phase === "idle" &&
    overlay === null &&
    (inFree || betValid) &&
    canAfford &&
    secondsLeft === 0;

  // ---- spin --------------------------------------------------------------------------------

  const showResult = useCallback(
    (response: Extract<SpinResponse, { ok: true }>) => {
      const symbolName = (symbol: string) => t(`slots.symbols.${symbol as SlotSymbol}`);
      const net = response.payout - response.bet;

      if (response.wins.length > 0) {
        const only = response.wins.length === 1 ? response.wins[0] : null;
        setScreen({
          tone: "win",
          main: only
            ? only.outcome === "run"
              ? t("slots.result.lineWin", {
                  line: only.line + 1,
                  count: only.count,
                  symbol: symbolName(only.symbol),
                })
              : t("slots.result.linePair", { line: only.line + 1 })
            : t("slots.result.manyLines", { count: response.wins.length }),
          sub:
            response.free || net <= 0
              ? t("slots.result.win", { amount: format.number(response.payout) })
              : `${t("slots.result.win", { amount: format.number(response.payout) })} · ${t("slots.result.net", { amount: format.number(net) })}`,
        });
      } else if (response.freeAwarded > 0) {
        setScreen({
          tone: "win",
          main: t("slots.result.freeWon", { count: response.freeAwarded }),
        });
      } else {
        setScreen({
          tone: "lose",
          main: t("slots.result.lose"),
          sub: response.free ? undefined : t("slots.result.loseHint"),
        });
      }
    },
    [format, t],
  );

  const spin = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || busyRef.current || !canSpin) return;
    busyRef.current = true;

    const startedAt = Date.now();
    const useQuick = quickRef.current || reducedRef.current;
    const before = wallet;
    const placed = inFree ? 0 : total;

    setPhase("spin");
    setWin(false);
    setWins([]);
    setWinCells([]);
    setCoins([]);
    setScreen({ tone: "neutral", main: t("slots.machine.spinning") });
    // The bet leaves the balance the moment the reels start, as it does on the server.
    if (placed > 0) setWallet((w) => w - placed);
    engine.start(activeReels);

    let response: SpinResponse;
    try {
      response = await spinSlots(guildId, activePerLine, activeLines, activeReels);
    } catch {
      response = { ok: false, code: "generic", error: t("slots.errors.generic") };
    }
    if (!mountedRef.current) return;

    if (!response.ok) {
      await engine.abort();
      if (!mountedRef.current) return;
      setWallet(response.wallet ?? before);
      if (response.retryAfterMs) setCooldownUntil(Date.now() + response.retryAfterMs);
      setScreen({ tone: "error", main: response.error });
      setPhase("idle");
      busyRef.current = false;
      return;
    }

    // Give the reels a moment to run even when the answer came back at once.
    const minRun = useQuick ? 450 : 900;
    await engine.stop(
      { quick: useQuick },
      Math.max(0, minRun - (Date.now() - startedAt)),
      (plans) => {
        // The symbols the server drew go onto the strips just ahead of the reels.
        setOverrides((previous) =>
          previous.map((current, reel) =>
            plans[reel]
              ? {
                  [wrap(plans[reel].index + 1)]: response.grid[reel][0],
                  [wrap(plans[reel].index)]: response.grid[reel][1],
                  [wrap(plans[reel].index - 1)]: response.grid[reel][2],
                }
              : current,
          ),
        );
      },
    );
    if (!mountedRef.current) return;

    setGrid(response.grid);
    setWallet(response.wallet);
    setWins(response.wins);
    setWinCells(response.cells);
    setFreeState(response.freeState);
    if (!response.free) setCooldownUntil(startedAt + cooldown * 1000);
    setNow(Date.now());
    showResult(response);

    if (response.payout > 0) {
      const ratio = response.payout / Math.max(1, response.perLine * response.lines);
      setWin(true);
      setCoins(makeCoins(Math.min(64, 12 + Math.round(ratio * 1.2))));
      later(() => setCoins([]), 3600);
      later(() => setWin(false), 2800);
    }

    setStats((s) => ({
      spins: s.spins + (response.free ? 0 : 1),
      wagered: s.wagered + response.bet,
      won: s.won + response.payout,
    }));

    // What comes next: the free spins just won, the end of a round, or a reminder to rest.
    if (response.freeAwarded > 0 && !response.free) {
      later(() => setOverlay({ kind: "freeWon", count: response.freeAwarded }), 1100);
    } else if (response.freeRoundTotal !== null) {
      later(() => setOverlay({ kind: "freeEnd", total: response.freeRoundTotal ?? 0 }), 1100);
    } else if (
      !response.free &&
      response.freeState === null &&
      (stats.spins + 1) % BREAK_REMINDER_EVERY === 0
    ) {
      later(() => setOverlay({ kind: "break" }), 900);
    }

    setPhase("idle");
    busyRef.current = false;
  }, [
    activeLines,
    activePerLine,
    activeReels,
    canSpin,
    cooldown,
    guildId,
    inFree,
    later,
    showResult,
    stats.spins,
    t,
    total,
    wallet,
  ]);

  // Space or Enter spin when nothing else on the page wants the key.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.code !== "Space" && event.key !== "Enter") return;
      const target = event.target as HTMLElement | null;
      if (
        target?.closest("input, textarea, select, button, a, [role='dialog'], [role='alertdialog']")
      ) {
        return;
      }
      event.preventDefault();
      void spin();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [spin]);

  // ---- parts -------------------------------------------------------------------------------

  const net = stats.won - stats.wagered;
  const signed = (value: number) => `${value > 0 ? "+" : ""}${format.number(value)}`;
  const state = phase === "spin" ? "spin" : win ? "win" : "idle";
  const winLines = useMemo(() => wins.map((w) => w.line), [wins]);

  const acknowledge = () => {
    writeStorage(ACK_KEY, "yes");
    setAck("yes");
  };

  const spinLabel =
    phase === "spin"
      ? t("slots.machine.spinning")
      : freeState
        ? t("slots.machine.spinFree", { left: freeState.left })
        : secondsLeft > 0
          ? t("slots.machine.wait", { seconds: secondsLeft })
          : t("slots.machine.spin");

  const reelLabel = (reel: number) =>
    phase === "spin" || !grid
      ? t("slots.machine.reel", { n: reel + 1 })
      : `${t("slots.machine.reel", { n: reel + 1 })}: ${grid[reel].map((s) => t(`slots.symbols.${s}`)).join(", ")}`;

  const bettingLocked = phase === "spin" || inFree;

  return (
    <Column gap="24" fillWidth>
      <SlotSymbolDefs />

      <ResponsibleBanner t={t} />

      <div
        className={locked ? styles.locked : undefined}
        inert={locked}
        aria-hidden={locked || undefined}
      >
        <div
          className={styles.stage}
          data-state={state}
          data-free={inFree}
          style={{ "--reels": activeReels } as React.CSSProperties}
        >
          <button
            type="button"
            className={styles.lever}
            onClick={() => void spin()}
            tabIndex={-1}
            aria-hidden="true"
            disabled={!canSpin}
          >
            <span className={styles.leverBase} />
            <span className={styles.leverArm} />
          </button>

          <div className={styles.cabinet} role="group" aria-label={t("slots.machine.machineLabel")}>
            <div className={styles.marquee}>
              <h2 className={styles.title}>{t("slots.machine.marquee")}</h2>
              <span className={styles.ribbon}>{t("slots.machine.ribbon")}</span>
            </div>
            <div className={styles.lights} aria-hidden="true">
              {LIGHTS.map((i) => (
                <span
                  key={i}
                  className={styles.light}
                  style={{ "--i": i } as React.CSSProperties}
                />
              ))}
            </div>

            <div className={styles.body}>
              <div className={styles.field}>
                {freeState && (
                  <div className={styles.freeBar} role="status">
                    <span>
                      {t("slots.machine.freeBar")} ·{" "}
                      {t("slots.machine.freeLeft", { left: freeState.left })}
                    </span>
                    <span>
                      {t("slots.machine.freeRound", { amount: format.number(freeState.won) })}
                    </span>
                  </div>
                )}

                <div className={styles.window}>
                  <div className={styles.reels}>
                    {REEL_STRIPS.slice(0, activeReels).map((strip, reel) => (
                      <Reel
                        key={reel}
                        strip={strip}
                        overrides={overrides[reel]}
                        start={START_POSITIONS[reel]}
                        label={reelLabel(reel)}
                        setRef={refSetters[reel]}
                      />
                    ))}
                  </div>
                  <LinesOverlay
                    reels={activeReels}
                    lines={activeLines}
                    winLines={winLines}
                    hidden={phase === "spin"}
                  />
                  <div className={styles.hits} aria-hidden="true">
                    {phase === "idle" &&
                      winCells.map(([reel, row]) => (
                        <span
                          key={`${reel}:${row}`}
                          className={styles.hit}
                          style={{ "--reel": reel, "--row": row } as React.CSSProperties}
                        />
                      ))}
                  </div>
                  <div className={styles.glass} />
                </div>

                <div
                  className={styles.screen}
                  data-tone={screen.tone}
                  role="status"
                  aria-live="polite"
                >
                  <span className={styles.screenMain}>{screen.main}</span>
                  {screen.sub && <span className={styles.screenSub}>{screen.sub}</span>}
                  {phase === "idle" && wins.length > 0 && (
                    <span className={styles.winList}>
                      {wins.map((w) => (
                        <span
                          key={w.line}
                          className={styles.winBadge}
                          style={{ "--c": LINE_COLORS[w.line] } as React.CSSProperties}
                        >
                          <i />
                          {t("slots.result.badge", {
                            line: w.line + 1,
                            symbol: t(`slots.symbols.${w.symbol}`),
                            amount: format.number(w.payout),
                          })}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              </div>

              <div className={styles.controls}>
                <div className={styles.row}>
                  <Column gap="4">
                    <span className={styles.label}>{t("slots.machine.balance")}</span>
                    <span className={styles.amount}>
                      <Currency currency={currency} />
                      <AnimatedAmount value={wallet} format={formatNumber} />
                    </span>
                  </Column>
                  <Column gap="4" horizontal="end">
                    <span className={styles.label}>{t("slots.machine.totalBet")}</span>
                    <span className={styles.amount}>
                      <Currency currency={currency} />
                      {format.number(total)}
                    </span>
                  </Column>
                </div>

                <div className={styles.row}>
                  <Column gap="4">
                    <span className={styles.label}>{t("slots.machine.lines")}</span>
                    <div
                      className={styles.modes}
                      role="group"
                      aria-label={t("slots.machine.lines")}
                    >
                      {LINE_MODES.map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          className={styles.chip}
                          aria-pressed={activeLines === mode}
                          aria-label={t("slots.machine.linesAria", { n: mode })}
                          disabled={bettingLocked || !modeAvailable(mode)}
                          title={
                            modeAvailable(mode) ? undefined : t("slots.machine.linesUnavailable")
                          }
                          onClick={() => pickLines(mode)}
                        >
                          {mode}
                        </button>
                      ))}
                    </div>
                  </Column>
                  {(wide || inFree) && (
                    <Column gap="4" horizontal="end">
                      <span className={styles.label}>{t("slots.machine.reels")}</span>
                      <div
                        className={styles.modes}
                        role="group"
                        aria-label={t("slots.machine.reels")}
                      >
                        {REEL_COUNTS.map((count) => (
                          <button
                            key={count}
                            type="button"
                            className={styles.chip}
                            aria-pressed={activeReels === count}
                            aria-label={t("slots.machine.reelsAria", { n: count })}
                            disabled={bettingLocked}
                            onClick={() => pickReels(count)}
                          >
                            {count}
                          </button>
                        ))}
                      </div>
                    </Column>
                  )}
                </div>

                <div className={styles.row}>
                  <Column gap="4">
                    <span className={styles.label} id="slots-bet-label">
                      {t("slots.machine.perLine")}
                    </span>
                    <div className={styles.betBox}>
                      <button
                        type="button"
                        className={styles.step}
                        aria-label={t("slots.machine.betDecrease")}
                        onClick={() => applyPerLine(perLine - betStep(perLine - 1))}
                        disabled={bettingLocked || perLine <= perMin}
                      >
                        −
                      </button>
                      <input
                        className={styles.betInput}
                        inputMode="numeric"
                        autoComplete="off"
                        aria-labelledby="slots-bet-label"
                        value={inFree ? String(activePerLine) : perLineText}
                        onChange={(event) => onBetInput(event.target.value)}
                        onBlur={() => applyPerLine(perLineText ? Number(perLineText) : perMin)}
                        disabled={bettingLocked}
                      />
                      <button
                        type="button"
                        className={styles.step}
                        aria-label={t("slots.machine.betIncrease")}
                        onClick={() => applyPerLine(perLine + betStep(perLine))}
                        disabled={bettingLocked || perLine >= perMax}
                      >
                        +
                      </button>
                    </div>
                  </Column>
                </div>

                <div className={styles.chips}>
                  <button
                    type="button"
                    className={styles.chip}
                    disabled={bettingLocked}
                    onClick={() => applyPerLine(perMin)}
                  >
                    {t("slots.machine.betMin")}
                  </button>
                  <button
                    type="button"
                    className={styles.chip}
                    disabled={bettingLocked}
                    aria-label={t("slots.machine.betHalf")}
                    onClick={() => applyPerLine(Math.floor(perLine / 2))}
                  >
                    ½
                  </button>
                  <button
                    type="button"
                    className={styles.chip}
                    disabled={bettingLocked}
                    aria-label={t("slots.machine.betDouble")}
                    onClick={() => applyPerLine(perLine * 2)}
                  >
                    ×2
                  </button>
                  <button
                    type="button"
                    className={styles.chip}
                    disabled={bettingLocked}
                    onClick={() =>
                      applyPerLine(Math.max(perMin, Math.min(perMax, Math.floor(wallet / lines))))
                    }
                  >
                    {t("slots.machine.betMax")}
                  </button>
                </div>

                <span className={styles.hint}>
                  {inFree
                    ? t("slots.machine.freeLocked")
                    : t("slots.machine.totalHint", {
                        lines: activeLines,
                        perLine: format.number(activePerLine),
                        total: format.number(total),
                      })}
                </span>

                <button
                  type="button"
                  className={styles.spin}
                  data-free={inFree}
                  onClick={() => void spin()}
                  disabled={!canSpin}
                >
                  {spinLabel}
                </button>

                {!inFree && betValid && !canAfford && phase === "idle" && (
                  <Text variant="body-default-xs" align="center" style={{ color: "#ffb3b9" }}>
                    {t("slots.machine.notEnough")}
                  </Text>
                )}

                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    checked={quick}
                    onChange={(event) => {
                      setQuick(event.target.checked);
                      writeStorage(QUICK_KEY, event.target.checked ? "1" : "0");
                    }}
                  />
                  {t("slots.machine.quick")}
                </label>
              </div>
            </div>

            {overlay && (
              <div
                className={styles.breakCard}
                role="alertdialog"
                aria-labelledby="slots-overlay-title"
              >
                <div className={styles.breakInner}>
                  <Text
                    variant="heading-strong-m"
                    id="slots-overlay-title"
                    style={{ color: "#fff" }}
                  >
                    {overlay.kind === "freeWon"
                      ? t("slots.result.freeWon", { count: overlay.count })
                      : overlay.kind === "freeEnd"
                        ? t("slots.result.freeEnd")
                        : t("slots.breakReminder.title")}
                  </Text>
                  <Text variant="body-default-s" style={{ color: "#e7d8f5" }}>
                    {overlay.kind === "freeWon"
                      ? t("slots.result.freeWonText")
                      : overlay.kind === "freeEnd"
                        ? t("slots.result.freeEndText", { amount: format.number(overlay.total) })
                        : t("slots.breakReminder.text", {
                            count: format.number(stats.spins),
                            net: signed(net),
                          })}
                  </Text>
                  <Button
                    variant="secondary"
                    size="m"
                    label={
                      overlay.kind === "freeWon"
                        ? t("slots.result.freeStart")
                        : overlay.kind === "freeEnd"
                          ? t("slots.result.continue")
                          : t("slots.breakReminder.dismiss")
                    }
                    onClick={() => setOverlay(null)}
                  />
                </div>
              </div>
            )}

            <div className={styles.burst} aria-hidden="true">
              {coins.map((coin) => (
                <span
                  key={coin.id}
                  className={styles.flyingCoin}
                  style={
                    {
                      "--x": `${coin.x}%`,
                      "--size": `${coin.size}px`,
                      "--dur": `${coin.dur}s`,
                      "--delay": `${coin.delay}s`,
                      "--dx": `${coin.dx}px`,
                      "--rot": `${coin.rot}deg`,
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {stats.spins > 0 && (
        <Row
          fillWidth
          gap="24"
          wrap
          horizontal="center"
          padding="16"
          radius="l"
          border="neutral-alpha-medium"
          background="surface"
        >
          <Stat label={t("slots.stats.spins")} value={format.number(stats.spins)} />
          <Stat label={t("slots.stats.wagered")} value={format.number(stats.wagered)} />
          <Stat label={t("slots.stats.won")} value={format.number(stats.won)} />
          <Stat
            label={t("slots.stats.net")}
            value={signed(net)}
            tone={net < 0 ? "danger" : net > 0 ? "brand" : undefined}
          />
        </Row>
      )}

      <div className={styles.info}>
        <Column
          gap="32"
          padding="24"
          radius="l"
          border="neutral-alpha-medium"
          background="surface"
          fillWidth
        >
          <PayTable t={t} format={format} reels={activeReels} />
        </Column>

        <Column
          padding="24"
          radius="l"
          border="neutral-alpha-medium"
          background="surface"
          fillWidth
        >
          <ResponsibleNotice t={t} />
        </Column>
      </div>

      <Text variant="body-default-xs" onBackground="neutral-weak" align="center">
        {t("slots.footer.text")}
      </Text>

      {ack === "no" && (
        <div
          className={styles.gate}
          role="dialog"
          aria-modal="true"
          aria-labelledby="slots-gate-title"
        >
          <Column
            className={styles.gateCard}
            gap="20"
            padding="24"
            radius="l"
            border="neutral-alpha-strong"
            background="surface"
          >
            <ResponsibleNotice t={t} compact titleId="slots-gate-title" />
            <Checkbox
              label={t("slots.gate.checkbox")}
              checked={acknowledged}
              onToggle={() => setAcknowledged((value) => !value)}
            />
            <Row gap="12" wrap>
              <Button
                variant="primary"
                size="m"
                label={t("slots.gate.accept")}
                disabled={!acknowledged}
                onClick={acknowledge}
              />
              <Button
                variant="tertiary"
                size="m"
                label={t("slots.gate.leave")}
                onClick={() => router.push("/profile/slots")}
              />
            </Row>
          </Column>
        </div>
      )}
    </Column>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "danger" | "brand";
}) {
  return (
    <Column gap="4" horizontal="center">
      <Text
        variant="label-default-xs"
        onBackground="neutral-weak"
        style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
      >
        {label}
      </Text>
      <Text
        variant="heading-strong-m"
        onBackground={
          tone === "danger" ? "danger-medium" : tone === "brand" ? "brand-medium" : "neutral-strong"
        }
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </Text>
    </Column>
  );
}
