"use client";

import { Button, Checkbox, Column, Row, Text } from "@once-ui-system/core";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { spinSlots, type SpinResponse } from "@/app/(main)/profile/slots/actions";
import { useFormat, useT } from "@/i18n/client";
import { BREAK_REMINDER_EVERY, type SlotSymbol } from "@/lib/slots/config";
import { Currency, type SlotsCurrency } from "./Currency";
import { PayTable } from "./PayTable";
import { ResponsibleBanner, ResponsibleNotice } from "./Responsible";
import { REEL_STRIPS, ReelEngine, symbolAt } from "./reelEngine";
import styles from "./SlotMachine.module.scss";
import { SlotSymbolDefs, SlotSymbolIcon } from "./symbols";

const ACK_KEY = "amelia:slots:ack:v1";
const QUICK_KEY = "amelia:slots:quick";
/** Where the reels stand before the first spin. */
const START_POSITIONS = [3, 8, 13];
/** Rows drawn per reel: one above, three visible, one below, so a sliding reel never shows a gap. */
const ROWS = [-1, 0, 1, 2, 3];
const LIGHTS = Array.from({ length: 16 }, (_, i) => i);

type Phase = "idle" | "spin";
type Tone = "neutral" | "win" | "lose" | "error";

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

/** A number that counts up or down to its target, so a changed balance is seen, not just replaced. */
function useCountUp(target: number, durationMs = 700): number {
  const [value, setValue] = useState(target);
  const current = useRef(target);

  useEffect(() => {
    if (current.current === target) return;
    if (prefersReducedMotion()) {
      current.current = target;
      setValue(target);
      return;
    }
    const from = current.current;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      current.current = Math.round(from + (target - from) * eased);
      setValue(current.current);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
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

export function SlotMachine({
  guildId,
  min,
  max,
  cooldown,
  currency,
  wallet: initialWallet,
  cooldownLeftMs,
}: SlotMachineProps) {
  const t = useT();
  const format = useFormat();
  const router = useRouter();

  const [ack, setAck] = useState<"unknown" | "yes" | "no">("unknown");
  const [acknowledged, setAcknowledged] = useState(false);
  const [quick, setQuick] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [wallet, setWallet] = useState(initialWallet);
  const [bet, setBet] = useState(() => Math.min(Math.max(min, 10), max));
  const [betText, setBetText] = useState(() => String(Math.min(Math.max(min, 10), max)));
  const [cells, setCells] = useState<number[]>(START_POSITIONS);
  const [winning, setWinning] = useState<number[]>([]);
  const [screen, setScreen] = useState<Screen>({ tone: "neutral", main: "" });
  const [win, setWin] = useState(false);
  const [coins, setCoins] = useState<Coin[]>([]);
  const [stats, setStats] = useState({ spins: 0, wagered: 0, won: 0 });
  const [breakOpen, setBreakOpen] = useState(false);
  // Both start at 0 and are set after mounting, so the server and the browser render the same.
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(0);

  const stripRefs = useRef<(HTMLDivElement | null)[]>([null, null, null]);
  const engineRef = useRef<ReelEngine | null>(null);
  const busyRef = useRef(false);
  const mountedRef = useRef(true);
  const quickRef = useRef(quick);
  quickRef.current = quick;
  const reducedRef = useRef(false);

  const shownWallet = useCountUp(wallet);

  // ---- setup -------------------------------------------------------------------------------

  useEffect(() => {
    reducedRef.current = prefersReducedMotion();
    setAck(readStorage(ACK_KEY) === "yes" ? "yes" : "no");
    const stored = readStorage(QUICK_KEY);
    setQuick(stored === null ? reducedRef.current : stored === "1");
    if (cooldownLeftMs > 0) {
      setNow(Date.now());
      setCooldownUntil(Date.now() + cooldownLeftMs);
    }
    // Only the state the page was opened with.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setScreen({ tone: "neutral", main: t("slots.machine.ready") });
    // The first message only; later ones come from spins.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFrame = useCallback((reel: number, pos: number, speed: number) => {
    const whole = Math.floor(pos);
    const el = stripRefs.current[reel];
    if (el) {
      el.style.transform = `translateY(calc(var(--cell) * ${(pos - whole).toFixed(4)}))`;
      const blur = speed > 5 && !reducedRef.current ? Math.min(3, (speed - 5) * 0.22) : 0;
      el.style.filter = blur > 0.1 ? `blur(${blur.toFixed(2)}px)` : "none";
    }
    setCells((previous) => {
      if (previous[reel] === whole) return previous;
      const next = previous.slice();
      next[reel] = whole;
      return next;
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const engine = new ReelEngine(REEL_STRIPS, onFrame, START_POSITIONS);
    engineRef.current = engine;
    return () => {
      mountedRef.current = false;
      engine.dispose();
      engineRef.current = null;
    };
  }, [onFrame]);

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

  // ---- bet ---------------------------------------------------------------------------------

  const applyBet = useCallback(
    (value: number) => {
      const next = Math.min(max, Math.max(min, Math.round(value)));
      setBet(next);
      setBetText(String(next));
    },
    [min, max],
  );

  const onBetInput = (text: string) => {
    const digits = text.replace(/\D/g, "").slice(0, 7);
    setBetText(digits);
    if (digits) setBet(Number(digits));
  };

  const onBetBlur = () => applyBet(betText ? Number(betText) : min);

  const betValid = Number.isInteger(bet) && bet >= min && bet <= max;
  const canAfford = wallet >= bet;
  const secondsLeft = cooldownUntil > now ? Math.ceil((cooldownUntil - now) / 1000) : 0;
  const locked = ack !== "yes";
  const canSpin =
    !locked && phase === "idle" && !breakOpen && betValid && canAfford && secondsLeft === 0;

  // ---- spin --------------------------------------------------------------------------------

  const spin = useCallback(async () => {
    const engine = engineRef.current;
    if (!engine || busyRef.current || !canSpin) return;
    busyRef.current = true;

    const startedAt = Date.now();
    const useQuick = quickRef.current || reducedRef.current;
    const placed = bet;
    const before = wallet;

    setPhase("spin");
    setWin(false);
    setWinning([]);
    setCoins([]);
    setScreen({ tone: "neutral", main: t("slots.machine.spinning") });
    // The bet leaves the balance the moment the reels start, as it does on the server.
    setWallet((w) => w - placed);
    engine.start();

    let response: SpinResponse;
    try {
      response = await spinSlots(guildId, placed);
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
    const minRun = useQuick ? 200 : 900;
    await engine.stop(
      response.reels,
      { quick: useQuick },
      Math.max(0, minRun - (Date.now() - startedAt)),
    );
    if (!mountedRef.current) return;

    const net = response.payout - response.bet;
    setWallet(response.wallet);
    setCooldownUntil(startedAt + cooldown * 1000);
    setNow(Date.now());

    if (response.payout > 0) {
      const symbol = response.reels[response.winning[0] ?? 0];
      setWinning(response.winning);
      setWin(true);
      setCoins(
        makeCoins(
          response.outcome === "triple"
            ? Math.min(64, 26 + Math.round(response.multiplier / 6))
            : 14,
        ),
      );
      window.setTimeout(() => mountedRef.current && setCoins([]), 3600);
      window.setTimeout(() => mountedRef.current && setWin(false), 2800);
      setScreen({
        tone: "win",
        main:
          response.outcome === "triple"
            ? t("slots.result.triple", { symbol: t(`slots.symbols.${symbol}`) })
            : t("slots.result.pair"),
        sub:
          net > 0
            ? `${t("slots.result.win", { amount: format.number(response.payout) })} · ${t("slots.result.net", { amount: format.number(net) })}`
            : t("slots.result.even"),
      });
    } else {
      setScreen({
        tone: "lose",
        main: t("slots.result.lose"),
        sub: t("slots.result.loseHint"),
      });
    }

    const spins = stats.spins + 1;
    setStats((s) => ({
      spins: s.spins + 1,
      wagered: s.wagered + response.bet,
      won: s.won + response.payout,
    }));
    if (spins % BREAK_REMINDER_EVERY === 0) setBreakOpen(true);

    setPhase("idle");
    busyRef.current = false;
  }, [bet, canSpin, cooldown, format, guildId, stats.spins, t, wallet]);

  // Space or Enter spin when nothing else on the page wants the key.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.code !== "Space" && event.key !== "Enter") return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, button, a, [role='dialog']")) return;
      event.preventDefault();
      void spin();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [spin]);

  // ---- parts -------------------------------------------------------------------------------

  const centers = useMemo(
    () => cells.map((n, reel) => symbolAt(REEL_STRIPS[reel], n)) as SlotSymbol[],
    [cells],
  );

  const net = stats.won - stats.wagered;
  const signed = (value: number) => `${value > 0 ? "+" : ""}${format.number(value)}`;
  const state = phase === "spin" ? "spin" : win ? "win" : "idle";

  const acknowledge = () => {
    writeStorage(ACK_KEY, "yes");
    setAck("yes");
  };

  const spinLabel =
    phase === "spin"
      ? t("slots.machine.spinning")
      : secondsLeft > 0
        ? t("slots.machine.wait", { seconds: secondsLeft })
        : t("slots.machine.spin");

  return (
    <Column gap="24" fillWidth>
      <SlotSymbolDefs />

      <ResponsibleBanner t={t} />

      <div
        className={locked ? styles.locked : undefined}
        inert={locked}
        aria-hidden={locked || undefined}
      >
        <div className={styles.stage} data-state={state}>
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

            <div className={styles.window}>
              <div className={styles.reels}>
                {REEL_STRIPS.map((strip, reel) => (
                  <div
                    key={reel}
                    className={styles.reel}
                    role="img"
                    aria-label={
                      phase === "spin"
                        ? t("slots.machine.reel", { n: reel + 1 })
                        : `${t("slots.machine.reel", { n: reel + 1 })}: ${t(`slots.symbols.${centers[reel]}`)}`
                    }
                  >
                    <div
                      className={styles.strip}
                      ref={(el) => {
                        stripRefs.current[reel] = el;
                      }}
                    >
                      {ROWS.map((row) => (
                        <div
                          key={row}
                          className={styles.cell}
                          data-row={row}
                          data-win={row === 1 && phase === "idle" && winning.includes(reel)}
                          style={{ "--row": row } as React.CSSProperties}
                        >
                          <SlotSymbolIcon
                            symbol={symbolAt(strip, cells[reel] + 1 - row)}
                            className={styles.symbol}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div
                className={styles.payline}
                role="presentation"
                title={t("slots.machine.payline")}
              />
              <div className={styles.glass} />
            </div>

            <div className={styles.screen} data-tone={screen.tone} role="status" aria-live="polite">
              <span className={styles.screenMain}>{screen.main}</span>
              {screen.sub && <span className={styles.screenSub}>{screen.sub}</span>}
            </div>

            <div className={styles.controls}>
              <div className={styles.row}>
                <Column gap="4">
                  <span className={styles.label}>{t("slots.machine.balance")}</span>
                  <span className={styles.amount}>
                    <Currency currency={currency} />
                    {format.number(shownWallet)}
                  </span>
                </Column>
                <Column gap="4" horizontal="end">
                  <span className={styles.label} id="slots-bet-label">
                    {t("slots.machine.bet")}
                  </span>
                  <div className={styles.betBox}>
                    <button
                      type="button"
                      className={styles.step}
                      aria-label={t("slots.machine.betDecrease")}
                      onClick={() => applyBet(bet - betStep(bet - 1))}
                      disabled={phase === "spin" || bet <= min}
                    >
                      −
                    </button>
                    <input
                      className={styles.betInput}
                      inputMode="numeric"
                      autoComplete="off"
                      aria-labelledby="slots-bet-label"
                      value={betText}
                      onChange={(event) => onBetInput(event.target.value)}
                      onBlur={onBetBlur}
                      disabled={phase === "spin"}
                    />
                    <button
                      type="button"
                      className={styles.step}
                      aria-label={t("slots.machine.betIncrease")}
                      onClick={() => applyBet(bet + betStep(bet))}
                      disabled={phase === "spin" || bet >= max}
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
                  disabled={phase === "spin"}
                  onClick={() => applyBet(min)}
                >
                  {t("slots.machine.betMin")}
                </button>
                <button
                  type="button"
                  className={styles.chip}
                  disabled={phase === "spin"}
                  aria-label={t("slots.machine.betHalf")}
                  onClick={() => applyBet(Math.floor(bet / 2))}
                >
                  ½
                </button>
                <button
                  type="button"
                  className={styles.chip}
                  disabled={phase === "spin"}
                  aria-label={t("slots.machine.betDouble")}
                  onClick={() => applyBet(bet * 2)}
                >
                  ×2
                </button>
                <button
                  type="button"
                  className={styles.chip}
                  disabled={phase === "spin"}
                  onClick={() => applyBet(Math.max(min, Math.min(max, wallet)))}
                >
                  {t("slots.machine.betMax")}
                </button>
              </div>

              <button
                type="button"
                className={styles.spin}
                onClick={() => void spin()}
                disabled={!canSpin}
              >
                {spinLabel}
              </button>

              {betValid && !canAfford && phase === "idle" && (
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

            {breakOpen && (
              <div
                className={styles.breakCard}
                role="alertdialog"
                aria-labelledby="slots-break-title"
              >
                <div className={styles.breakInner}>
                  <Text variant="heading-strong-m" id="slots-break-title" style={{ color: "#fff" }}>
                    {t("slots.breakReminder.title")}
                  </Text>
                  <Text variant="body-default-s" style={{ color: "#e7d8f5" }}>
                    {t("slots.breakReminder.text", {
                      count: format.number(stats.spins),
                      net: signed(net),
                    })}
                  </Text>
                  <Button
                    variant="secondary"
                    size="m"
                    label={t("slots.breakReminder.dismiss")}
                    onClick={() => setBreakOpen(false)}
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

      <Column
        gap="32"
        padding="24"
        radius="l"
        border="neutral-alpha-medium"
        background="surface"
        fillWidth
      >
        <PayTable t={t} format={format} />
      </Column>

      <Column padding="24" radius="l" border="neutral-alpha-medium" background="surface" fillWidth>
        <ResponsibleNotice t={t} />
      </Column>

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
