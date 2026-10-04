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
import { Column, Flex, Grid, IconButton, Input, Media, Row, Spinner, Text } from "@once-ui-system/core";
import classNames from "classnames";
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
      <Media
        src={emojiCdnUrl({ id: emoji.id, name: emoji.name, animated: emoji.animated }, size * 2)}
        alt={emoji.name}
        unoptimized
        aspectRatio="1"
        objectFit="contain"
        fillWidth={false}
        sizes={size}
        className={styles.glyphImage}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <Text className={styles.glyphText} style={{ fontSize: size * 0.92 }} aria-label={emoji.name} role="img">
      {emoji.unicode}
    </Text>
  );
}

interface CellProps {
  entry: EmojiEntry;
}

const Cell = memo(function Cell({ entry }: CellProps) {
  return (
    <Flex
      as="button"
      {...{ type: "button" }}
      center
      minWidth={0}
      aspectRatio={1}
      radius="s"
      className={classNames("reset-button-styles", styles.cell)}
      data-key={entry.key}
      tabIndex={-1}
      aria-label={entry.kind === "unicode" ? entry.label : entry.emoji.name}
    >
      {entry.kind === "unicode" ? (
        entry.unicode
      ) : (
        <EmojiGlyph
          size={28}
          value={{ type: "custom", id: entry.emoji.id, name: entry.emoji.name, animated: entry.emoji.animated }}
        />
      )}
    </Flex>
  );
});

interface SectionData {
  id: string;
  title: string;
  entries: EmojiEntry[];
}

const Section = memo(function Section({ section }: { section: SectionData }) {
  return (
    <Column as="section" className={styles.section} data-section={section.id}>
      <Flex
        as="h3"
        position="sticky"
        top="0"
        zIndex={1}
        margin="0"
        paddingTop="8"
        paddingX="4"
        paddingBottom="4"
        background="surface"
        onBackground="neutral-weak"
        className={styles.sectionTitle}
      >
        {section.title}
      </Flex>
      <Grid columns="9" gap="2" fillWidth role="grid" aria-label={section.title}>
        {section.entries.map((entry) => (
          <Cell key={entry.key} entry={entry} />
        ))}
      </Grid>
    </Column>
  );
});

interface FooterHandle {
  show: (entry: EmojiEntry | null) => void;
}

function Footer({ handle, hint }: { handle: React.Ref<FooterHandle>; hint: string }) {
  const [entry, setEntry] = useState<EmojiEntry | null>(null);
  useImperativeHandle(handle, () => ({ show: setEntry }), []);

  return (
    <Row
      vertical="center"
      gap="12"
      minHeight={3.25}
      paddingX="16"
      paddingY="8"
      borderTop="neutral-medium"
      background="neutral-alpha-weak"
      style={{ flexShrink: 0 }}
      aria-live="polite"
    >
      {entry ? (
        <>
          <Row center width={2} height={2} style={{ flexShrink: 0 }}>
            {entry.kind === "unicode" ? (
              <Text className={styles.footerGlyph}>{entry.unicode}</Text>
            ) : (
              <EmojiGlyph
                size={32}
                value={{ type: "custom", id: entry.emoji.id, name: entry.emoji.name, animated: entry.emoji.animated }}
              />
            )}
          </Row>
          <Text variant="body-strong-s" truncate>
            {entry.kind === "unicode" ? entry.label : `:${entry.emoji.name}:`}
          </Text>
        </>
      ) : (
        <Text variant="body-default-xs" onBackground="neutral-weak">
          {hint}
        </Text>
      )}
    </Row>
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
    if (!autoFocus) return;

    // The popover stays `visibility: hidden` for a frame or two while it is positioned, and a
    // hidden field cannot take focus: try again until it sticks.
    let frame = 0;
    let tries = 0;
    const focusSearch = () => {
      const field = searchRef.current;
      if (!field) return;
      field.focus({ preventScroll: true });
      if (document.activeElement !== field && tries++ < 30) frame = requestAnimationFrame(focusSearch);
    };
    focusSearch();
    return () => cancelAnimationFrame(frame);
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
        list.push({ id: group.key, node: <Text className={styles.tabGlyph}>{group.glyph}</Text>, label: groupLabel(group.key) });
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
    <Column
      data-testid="emoji-picker"
      width="calc(min(372px, 100vw - 32px))"
      height="calc(min(440px, 100dvh - 120px))"
      background="surface"
      border="neutral-medium"
      radius="l"
      overflow="hidden"
      onBackground="neutral-strong"
      className={styles.panel}
    >
      <Row marginX="12" marginTop="12" marginBottom="8" vertical="center" style={{ flexShrink: 0 }}>
        <Input
          id="emoji-picker-search"
          ref={searchRef}
          size="xs"
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
          prefix={<LuSearch size={16} aria-hidden />}
          suffix={
            query ? (
              <IconButton
                variant="tertiary"
                size="s"
                rounded
                type="button"
                onClick={() => setQuery("")}
                aria-label={t("common.emoji.clear")}
              >
                <LuX size={14} />
              </IconButton>
            ) : undefined
          }
        />
      </Row>

      {tabs.length > 0 && (
        <Row
          role="tablist"
          gap="2"
          paddingX="12"
          paddingBottom="8"
          borderBottom="neutral-medium"
          overflowX="auto"
          className={styles.tabs}
          style={{ flexShrink: 0 }}
        >
          {tabs.map((tab) => (
            <IconButton
              key={tab.id}
              variant="tertiary"
              size="m"
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
            </IconButton>
          ))}
        </Row>
      )}

      <Column
        ref={scrollRef}
        // Static on purpose: `jumpTo` and `onScroll` measure the sections against this container.
        position="static"
        flex="1"
        minHeight={0}
        paddingX="8"
        paddingBottom="8"
        overflowY="auto"
        overflowX="hidden"
        scrollbar="default"
        className={styles.scroll}
        onClick={onClick}
        onKeyDown={onKeyDown}
        onScroll={onScroll}
        onMouseOver={(e) => footerRef.current?.show(entryOf(e.target))}
        onMouseLeave={() => footerRef.current?.show(null)}
        onFocus={(e) => footerRef.current?.show(entryOf(e.target))}
      >
        {!unicodeOnly && custom.status === "error" && <Notice>{t("common.emoji.serverFailed")}</Notice>}
        {!unicodeOnly && custom.status === "ready" && customEntries.length === 0 && !deferredQuery && (
          <Notice>{t("common.emoji.serverEmpty")}</Notice>
        )}

        {loading && (
          <Column center fillWidth minHeight={10}>
            <Spinner />
          </Column>
        )}
        {failed && <Notice>{t("common.emoji.unicodeFailed")}</Notice>}

        {!loading && sections.length === 0 && !failed && (
          <Column center fillWidth minHeight={10}>
            <Text variant="body-default-s" onBackground="neutral-weak">
              {t("common.emoji.noResults")}
            </Text>
          </Column>
        )}

        {sections.map((section) => (
          <Section key={section.id} section={section} />
        ))}
      </Column>

      <Footer handle={footerRef} hint={t("common.emoji.hoverHint")} />
    </Column>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <Column marginTop="8" marginX="4" paddingX="12" paddingY="8" radius="m" background="neutral-alpha-weak">
      <Text variant="body-default-xs" onBackground="neutral-medium">
        {children}
      </Text>
    </Column>
  );
}
