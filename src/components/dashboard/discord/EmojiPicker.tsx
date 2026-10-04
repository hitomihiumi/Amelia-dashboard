"use client";

import { useDiscordPreviewOptional } from "@/contexts/DiscordPreviewContext";
import { useLocale, useT } from "@/i18n/client";
import {
  type DiscordGuildEmoji,
  type PickedEmoji,
  emojiCdnUrl,
  emojiToText,
  parseEmojiText,
} from "@/lib/discord/emojis-api";
import {
  UNICODE_GROUPS,
  type UnicodeEmojiItem,
  type UnicodeEmojiSet,
  type UnicodeGroupKey,
  loadUnicodeEmojis,
} from "@/lib/discord/unicode-emoji";
import { Spinner } from "@once-ui-system/core";
import {
  type KeyboardEvent,
  type MouseEvent,
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { LuClock, LuSearch, LuServer, LuX } from "react-icons/lu";
import styles from "./EmojiPicker.module.scss";

// ---------------------------------------------------------------------------
// data
// ---------------------------------------------------------------------------

type EmojiEntry =
  | { key: string; kind: "unicode"; unicode: string; label: string }
  | { key: string; kind: "custom"; emoji: DiscordGuildEmoji };

const RECENT_KEY = "amelia-emoji-recent";
const RECENT_LIMIT = 27;

function readRecent(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function rememberRecent(text: string) {
  try {
    const next = [text, ...readRecent().filter((v) => v !== text)].slice(0, RECENT_LIMIT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // private mode or blocked storage: the picker works without a history
  }
}

type CustomState =
  | { status: "loading" }
  | { status: "ready"; emojis: DiscordGuildEmoji[] }
  | { status: "error" };

const customCache = new Map<string, { at: number; emojis: DiscordGuildEmoji[] }>();
const CUSTOM_TTL = 60_000;

function useGuildEmojis(guildId: string | undefined, enabled: boolean): CustomState {
  const [state, setState] = useState<CustomState>(() => {
    const hit = guildId ? customCache.get(guildId) : undefined;
    return hit && Date.now() - hit.at < CUSTOM_TTL
      ? { status: "ready", emojis: hit.emojis }
      : { status: "loading" };
  });

  useEffect(() => {
    if (!guildId || !enabled) return;
    const hit = customCache.get(guildId);
    if (hit && Date.now() - hit.at < CUSTOM_TTL) {
      setState({ status: "ready", emojis: hit.emojis });
      return;
    }

    let cancelled = false;
    fetch(`/api/dashboard/${guildId}/emojis`)
      .then(async (res) => {
        const json = (await res.json()) as { ok?: boolean; emojis?: DiscordGuildEmoji[] };
        if (!res.ok || !json.ok) throw new Error("emojis");
        const emojis = json.emojis ?? [];
        customCache.set(guildId, { at: Date.now(), emojis });
        if (!cancelled) setState({ status: "ready", emojis });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [guildId, enabled]);

  return state;
}

type UnicodeState =
  | { status: "loading" }
  | { status: "ready"; set: UnicodeEmojiSet }
  | { status: "error" };

function useUnicodeEmojis(): UnicodeState {
  const locale = useLocale();
  const [state, setState] = useState<UnicodeState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });
    loadUnicodeEmojis(locale)
      .then((set) => !cancelled && setState({ status: "ready", set }))
      .catch(() => !cancelled && setState({ status: "error" }));
    return () => {
      cancelled = true;
    };
  }, [locale]);

  return state;
}

// ---------------------------------------------------------------------------
// pieces
// ---------------------------------------------------------------------------

/** An emoji, drawn from the CDN when it is a server one and as text otherwise. */
export function EmojiGlyph({ value, size = 24 }: { value: string | PickedEmoji | null | undefined; size?: number }) {
  const emoji = typeof value === "string" || value == null ? parseEmojiText(value) : value;
  if (!emoji) return null;
  if (emoji.type === "custom") {
    return (
      // biome-ignore lint/performance/noImgElement: Discord CDN image of unknown size
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={emojiCdnUrl({ id: emoji.id, name: emoji.name, animated: emoji.animated }, size * 2)}
        alt={emoji.name}
        width={size}
        height={size}
        loading="lazy"
        draggable={false}
        className={styles.glyphImage}
      />
    );
  }
  return (
    <span className={styles.glyphText} style={{ fontSize: size * 0.92 }} aria-label={emoji.name} role="img">
      {emoji.unicode}
    </span>
  );
}

interface CellProps {
  entry: EmojiEntry;
}

const Cell = memo(function Cell({ entry }: CellProps) {
  return (
    <button
      type="button"
      className={styles.cell}
      data-key={entry.key}
      tabIndex={-1}
      aria-label={entry.kind === "unicode" ? entry.label : entry.emoji.name}
    >
      {entry.kind === "unicode" ? (
        <span className={styles.cellGlyph}>{entry.unicode}</span>
      ) : (
        <EmojiGlyph
          size={28}
          value={{ type: "custom", id: entry.emoji.id, name: entry.emoji.name, animated: entry.emoji.animated }}
        />
      )}
    </button>
  );
});

interface SectionData {
  id: string;
  title: string;
  entries: EmojiEntry[];
}

const Section = memo(function Section({ section }: { section: SectionData }) {
  return (
    <section className={styles.section} data-section={section.id}>
      <h3 className={styles.sectionTitle}>{section.title}</h3>
      <div className={styles.grid} role="grid" aria-label={section.title}>
        {section.entries.map((entry) => (
          <Cell key={entry.key} entry={entry} />
        ))}
      </div>
    </section>
  );
});

interface FooterHandle {
  show: (entry: EmojiEntry | null) => void;
}

function Footer({ handle, hint }: { handle: React.Ref<FooterHandle>; hint: string }) {
  const [entry, setEntry] = useState<EmojiEntry | null>(null);
  useImperativeHandle(handle, () => ({ show: setEntry }), []);

  return (
    <div className={styles.footer} aria-live="polite">
      {entry ? (
        <>
          <span className={styles.footerGlyph}>
            {entry.kind === "unicode" ? (
              <span style={{ fontSize: 28, lineHeight: 1 }}>{entry.unicode}</span>
            ) : (
              <EmojiGlyph
                size={32}
                value={{ type: "custom", id: entry.emoji.id, name: entry.emoji.name, animated: entry.emoji.animated }}
              />
            )}
          </span>
          <span className={styles.footerName}>
            {entry.kind === "unicode" ? entry.label : `:${entry.emoji.name}:`}
          </span>
        </>
      ) : (
        <span className={styles.footerHint}>{hint}</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// picker
// ---------------------------------------------------------------------------

export interface EmojiPickerProps {
  /** Server whose custom emojis are offered; read from the dashboard context when omitted. */
  guildId?: string;
  onSelect: (emoji: PickedEmoji) => void;
  /** Called after a pick, so a popover can close itself. */
  onClose?: () => void;
  /** Hide the "This server" tab (for places where a custom emoji makes no sense). */
  unicodeOnly?: boolean;
  autoFocus?: boolean;
}

/** Emoji panel: search, category tabs, recent, the server's own emojis and the standard set. */
export function EmojiPicker({ guildId, onSelect, onClose, unicodeOnly, autoFocus = true }: EmojiPickerProps) {
  const t = useT();
  const context = useDiscordPreviewOptional();
  const guild = guildId ?? context?.guildId;

  const unicode = useUnicodeEmojis();
  const custom = useGuildEmojis(guild, !unicodeOnly);

  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const [recent, setRecent] = useState<string[]>([]);
  const [active, setActive] = useState<string>("");

  const searchRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<FooterHandle>(null);

  useEffect(() => {
    setRecent(readRecent());
    if (autoFocus) searchRef.current?.focus({ preventScroll: true });
  }, [autoFocus]);

  const groupLabel = useCallback((key: string) => t(`common.emoji.groups.${key}` as never) as string, [t]);

  const customEntries = useMemo<EmojiEntry[]>(
    () =>
      custom.status === "ready"
        ? custom.emojis.map((emoji) => ({ key: `c:${emoji.id}`, kind: "custom" as const, emoji }))
        : [],
    [custom],
  );

  /** Every entry by key, for resolving clicks and recent items. */
  const index = useMemo(() => {
    const map = new Map<string, EmojiEntry>();
    for (const entry of customEntries) map.set(entry.key, entry);
    if (unicode.status === "ready") {
      for (const group of UNICODE_GROUPS) {
        for (const item of unicode.set[group.key]) {
          map.set(`u:${item.unicode}`, {
            key: `u:${item.unicode}`,
            kind: "unicode",
            unicode: item.unicode,
            label: item.label,
          });
        }
      }
    }
    return map;
  }, [customEntries, unicode]);

  const sections = useMemo<SectionData[]>(() => {
    const out: SectionData[] = [];
    const toUnicodeEntries = (items: UnicodeEmojiItem[]): EmojiEntry[] =>
      items.map((item) => index.get(`u:${item.unicode}`)).filter(Boolean) as EmojiEntry[];

    if (deferredQuery) {
      const customHits = customEntries.filter(
        (entry) => entry.kind === "custom" && entry.emoji.name.toLowerCase().includes(deferredQuery),
      );
      if (customHits.length > 0) out.push({ id: "server", title: groupLabel("server"), entries: customHits });

      if (unicode.status === "ready") {
        const hits: UnicodeEmojiItem[] = [];
        for (const group of UNICODE_GROUPS) {
          for (const item of unicode.set[group.key]) {
            if (item.search.includes(deferredQuery) || item.unicode === deferredQuery) hits.push(item);
          }
        }
        if (hits.length > 0) {
          out.push({ id: "results", title: t("common.emoji.searchResults"), entries: toUnicodeEntries(hits.slice(0, 240)) });
        }
      }
      return out;
    }

    const recentEntries = recent
      .map((text) => {
        const parsed = parseEmojiText(text);
        if (!parsed) return null;
        return index.get(parsed.type === "custom" ? `c:${parsed.id}` : `u:${parsed.unicode}`) ?? null;
      })
      .filter(Boolean) as EmojiEntry[];
    if (recentEntries.length > 0) out.push({ id: "recent", title: groupLabel("recent"), entries: recentEntries });

    if (customEntries.length > 0) out.push({ id: "server", title: groupLabel("server"), entries: customEntries });

    if (unicode.status === "ready") {
      for (const group of UNICODE_GROUPS) {
        out.push({
          id: group.key,
          title: groupLabel(group.key),
          entries: toUnicodeEntries(unicode.set[group.key]),
        });
      }
    }
    return out;
  }, [deferredQuery, customEntries, unicode, recent, index, groupLabel, t]);

  // Tabs mirror the sections that exist right now.
  const tabs = useMemo(() => {
    if (deferredQuery) return [];
    const list: { id: string; node: React.ReactNode; label: string }[] = [];
    if (sections.some((s) => s.id === "recent")) {
      list.push({ id: "recent", node: <LuClock size={16} />, label: groupLabel("recent") });
    }
    if (sections.some((s) => s.id === "server")) {
      list.push({ id: "server", node: <LuServer size={16} />, label: groupLabel("server") });
    }
    for (const group of UNICODE_GROUPS) {
      if (sections.some((s) => s.id === group.key)) {
        list.push({ id: group.key, node: <span className={styles.tabGlyph}>{group.glyph}</span>, label: groupLabel(group.key) });
      }
    }
    return list;
  }, [sections, deferredQuery, groupLabel]);

  const jumpTo = (id: string) => {
    const container = scrollRef.current;
    const target = container?.querySelector<HTMLElement>(`[data-section="${id}"]`);
    if (!container || !target) return;
    container.scrollTo({ top: target.offsetTop - container.offsetTop, behavior: "smooth" });
    setActive(id);
  };

  const onScroll = () => {
    const container = scrollRef.current;
    if (!container || deferredQuery) return;
    const top = container.scrollTop + 8;
    let current = "";
    for (const el of container.querySelectorAll<HTMLElement>("[data-section]")) {
      if (el.offsetTop - container.offsetTop <= top) current = el.dataset.section ?? "";
    }
    if (current && current !== active) setActive(current);
  };

  const pick = (entry: EmojiEntry) => {
    const emoji: PickedEmoji =
      entry.kind === "unicode"
        ? { type: "unicode", unicode: entry.unicode, name: entry.label }
        : { type: "custom", id: entry.emoji.id, name: entry.emoji.name, animated: entry.emoji.animated };
    rememberRecent(emojiToText(emoji));
    onSelect(emoji);
    onClose?.();
  };

  const entryOf = (target: EventTarget | null): EmojiEntry | null => {
    const key = (target as HTMLElement | null)?.closest<HTMLElement>("[data-key]")?.dataset.key;
    return key ? (index.get(key) ?? null) : null;
  };

  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    const entry = entryOf(event.target);
    if (entry) pick(entry);
  };

  const cells = () => Array.from(scrollRef.current?.querySelectorAll<HTMLElement>("[data-key]") ?? []);

  /** Arrow keys move to the nearest cell in that direction, across section borders too. */
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const current = (event.target as HTMLElement).closest<HTMLElement>("[data-key]");
    if (event.key === "ArrowDown" && !current) {
      event.preventDefault();
      cells()[0]?.focus();
      return;
    }
    if (!current) return;

    const all = cells();
    const at = all.indexOf(current);
    let next: HTMLElement | undefined;

    if (event.key === "ArrowRight") next = all[at + 1];
    else if (event.key === "ArrowLeft") next = at > 0 ? all[at - 1] : undefined;
    else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      const rect = current.getBoundingClientRect();
      const down = event.key === "ArrowDown";
      const rows = all
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => (down ? r.top > rect.top + 4 : r.top < rect.top - 4));
      if (rows.length > 0) {
        const rowTop = down
          ? Math.min(...rows.map(({ r }) => r.top))
          : Math.max(...rows.map(({ r }) => r.top));
        next = rows
          .filter(({ r }) => Math.abs(r.top - rowTop) < 4)
          .sort((a, b) => Math.abs(a.r.left - rect.left) - Math.abs(b.r.left - rect.left))[0]?.el;
      }
    } else return;

    event.preventDefault();
    if (next) {
      next.focus();
      next.scrollIntoView({ block: "nearest" });
      const entry = entryOf(next);
      if (entry) footerRef.current?.show(entry);
    } else if (event.key === "ArrowUp") {
      searchRef.current?.focus();
    }
  };

  const loading = unicode.status === "loading";
  const failed = unicode.status === "error";

  return (
    <div className={styles.panel} data-testid="emoji-picker">
      <div className={styles.searchRow}>
        <LuSearch size={16} className={styles.searchIcon} aria-hidden />
        <input
          ref={searchRef}
          className={styles.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              cells()[0]?.focus();
            }
          }}
          placeholder={t("common.emoji.search")}
          aria-label={t("common.emoji.search")}
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button type="button" className={styles.clear} onClick={() => setQuery("")} aria-label={t("common.emoji.clear")}>
            <LuX size={14} />
          </button>
        )}
      </div>

      {tabs.length > 0 && (
        <div className={styles.tabs} role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={(active || tabs[0].id) === tab.id}
              aria-label={tab.label}
              title={tab.label}
              className={styles.tab}
              data-active={(active || tabs[0].id) === tab.id}
              onClick={() => jumpTo(tab.id)}
            >
              {tab.node}
            </button>
          ))}
        </div>
      )}

      <div
        ref={scrollRef}
        className={styles.scroll}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onScroll={onScroll}
        onMouseOver={(e) => footerRef.current?.show(entryOf(e.target))}
        onMouseLeave={() => footerRef.current?.show(null)}
        onFocus={(e) => footerRef.current?.show(entryOf(e.target))}
      >
        {!unicodeOnly && custom.status === "error" && (
          <p className={styles.notice}>{t("common.emoji.serverFailed")}</p>
        )}
        {!unicodeOnly && custom.status === "ready" && customEntries.length === 0 && !deferredQuery && (
          <p className={styles.notice}>{t("common.emoji.serverEmpty")}</p>
        )}

        {loading && (
          <div className={styles.center}>
            <Spinner />
          </div>
        )}
        {failed && <p className={styles.notice}>{t("common.emoji.unicodeFailed")}</p>}

        {!loading && sections.length === 0 && !failed && (
          <div className={styles.center}>{t("common.emoji.noResults")}</div>
        )}

        {sections.map((section) => (
          <Section key={section.id} section={section} />
        ))}
      </div>

      <Footer handle={footerRef} hint={t("common.emoji.hoverHint")} />
    </div>
  );
}
