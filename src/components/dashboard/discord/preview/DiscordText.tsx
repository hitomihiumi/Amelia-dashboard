"use client";

import { useDiscordPreviewOptional } from "@/contexts/DiscordPreviewContext";
import { replacePreviewTags } from "@/lib/discord/preview-tags";
import type { ReactNode } from "react";
import { Fragment, useMemo } from "react";

/** Discord-flavoured markdown renderer for the live preview area.
 *
 * Supports: **bold**, *italic*, __underline__, ~~strike~~, `code`, ||spoiler||,
 * ```code fences```, # / ## / ### headings, > blockquotes, [label](url) links,
 * bare URL autolinking, <@id>/<@&id>/<#id> mentions, <t:unix:STYLE> timestamps,
 * and custom emoji <(a):name:id>.
 *
 * Implemented with a single left-to-right scanner (no regex lookbehind) so it
 * stays hydration-safe and SSR-stable (timestamps use a frozen offset).
 */

const PREVIEW_USER = "User";

const TS_FROZEN_NOW = 1711462000; // matches src/lib/message-preview-tags in the sample

function formatTimestamp(unix: number, style: string): string {
  const d = new Date(unix * 1000);
  if (Number.isNaN(d.getTime())) return "…";
  const locale = "en-US";
  switch (style) {
    case "t":
      return d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
    case "T":
      return d.toLocaleTimeString(locale, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    case "d":
      return d.toLocaleDateString(locale);
    case "D":
      return d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
    case "F":
      return d.toLocaleString(locale, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    case "f":
      return d.toLocaleString(locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    case "R": {
      const diffSec = Math.round((Date.now() - d.getTime()) / 1000);
      const abs = Math.abs(diffSec);
      const fmt = (n: number, unit: string) =>
        diffSec >= 0 ? `${n} ${unit} ago` : `in ${n} ${unit}`;
      if (abs < 60) return diffSec >= 0 ? "just now" : "in a moment";
      const mins = Math.round(abs / 60);
      if (mins < 60) return fmt(mins, "min");
      const hrs = Math.round(abs / 3600);
      if (hrs < 24) return fmt(hrs, "hr");
      const days = Math.round(abs / 86400);
      return fmt(days, days === 1 ? "day" : "days");
    }
    default:
      return d.toLocaleString(locale);
  }
}

function consumeEmoji(rest: string): { node: ReactNode; consumed: number } | null {
  const m = /^<a?:(\w+):(\d{17,20})>/.exec(rest);
  if (!m) return null;
  const animated = rest[1] === "a";
  const name = m[1];
  const id = m[2];
  const ext = animated ? "gif" : "webp";
  return {
    node: (
      <img
        src={`https://cdn.discordapp.com/emojis/${id}.${ext}?size=44`}
        alt={`:${name}:`}
        title={`:${name}:`}
        className="inline-block h-[1.375em] w-[1.375em] align-bottom object-contain"
        style={{ display: "inline-block" }}
        loading="lazy"
      />
    ),
    consumed: m[0].length,
  };
}

function consumeMention(rest: string): { node: ReactNode; consumed: number } | null {
  const roleM = /^<@&(\d{17,20})>/.exec(rest);
  if (roleM) {
    return {
      node: (
        <span className="rounded px-1 font-medium bg-discord-brand/25 text-[#c9cdfb]">@Role</span>
      ),
      consumed: roleM[0].length,
    };
  }
  const userM = /^<@!?(\d{17,20})>/.exec(rest);
  if (userM) {
    return {
      node: (
        <span className="rounded px-1 font-medium bg-discord-brand/25 text-[#c9cdfb]">
          @{PREVIEW_USER}
        </span>
      ),
      consumed: userM[0].length,
    };
  }
  const chM = /^<#(\d{17,20})>/.exec(rest);
  if (chM) {
    return {
      node: (
        <span className="rounded px-1 font-medium bg-discord-interactive-muted/45 text-discord-link">
          #channel
        </span>
      ),
      consumed: chM[0].length,
    };
  }
  const tsM = /^<t:(\d{1,20}):([tTdDfFR])>/.exec(rest);
  if (tsM) {
    return {
      node: (
        <span className="rounded bg-discord-interactive-muted/40 px-1 text-xs">
          {formatTimestamp(Number(tsM[1]), tsM[2])}
        </span>
      ),
      consumed: tsM[0].length,
    };
  }
  return null;
}

function consumeUrl(rest: string): { node: ReactNode; consumed: number } | null {
  const m = /^(https?:\/\/[^\s<]+)/i.exec(rest);
  if (!m) return null;
  const href = m[1];
  return {
    node: (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-discord-link hover:underline">
        {href}
      </a>
    ),
    consumed: href.length,
  };
}

function consumeMarkdownLink(rest: string): { node: ReactNode; consumed: number } | null {
  const m = /^\[([^\]]*)\]\(([^)\s]+)\)/.exec(rest);
  if (!m) return null;
  return {
    node: (
      <a
        href={m[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-discord-link hover:underline"
      >
        {renderInline(m[1])}
      </a>
    ),
    consumed: m[0].length,
  };
}

function consumeCode(rest: string): { node: ReactNode; consumed: number } | null {
  const m = /^`([^`]+)`/.exec(rest);
  if (!m) return null;
  return {
    node: (
      <code className="rounded bg-discord-bg-secondary px-1 py-px font-mono text-[0.875em] text-discord-text-normal">
        {m[1]}
      </code>
    ),
    consumed: m[0].length,
  };
}

function consumeSpoiler(rest: string): { node: ReactNode; consumed: number } | null {
  if (!rest.startsWith("||")) return null;
  const end = rest.indexOf("||", 2);
  if (end === -1) return null;
  const inner = rest.slice(2, end);
  return {
    node: (
      <span
        className="rounded bg-discord-bg-tertiary px-1 text-discord-bg-tertiary transition-colors [filter:blur(3px)] hover:[filter:none] hover:text-discord-text-normal cursor-pointer"
        title="Spoiler"
      >
        {renderInline(inner)}
      </span>
    ),
    consumed: end + 2,
  };
}

function consumePair(
  rest: string,
  marker: string,
  className: string,
  Tag: "span" | "strong" | "em" = "span",
): { node: ReactNode; consumed: number } | null {
  if (!rest.startsWith(marker)) return null;
  const end = rest.indexOf(marker, marker.length);
  if (end === -1) return null;
  const inner = rest.slice(marker.length, end);
  return {
    node: <Tag className={className}>{renderInline(inner)}</Tag>,
    consumed: end + marker.length,
  };
}

function renderInline(input: string): ReactNode[] {
  if (!input) return [];
  const out: ReactNode[] = [];
  let rest = input;
  let key = 0;
  while (rest.length) {
    if (rest.startsWith("||")) {
      const r = consumeSpoiler(rest);
      if (r) {
        out.push(<Fragment key={key++}>{r.node}</Fragment>);
        rest = rest.slice(r.consumed);
        continue;
      }
    }
    if (rest.startsWith("**")) {
      const r = consumePair(rest, "**", "font-semibold text-discord-header-primary", "strong");
      if (r) {
        out.push(<Fragment key={key++}>{r.node}</Fragment>);
        rest = rest.slice(r.consumed);
        continue;
      }
    }
    if (rest.startsWith("__")) {
      const r = consumePair(rest, "__", "underline decoration-discord-text-normal");
      if (r) {
        out.push(<Fragment key={key++}>{r.node}</Fragment>);
        rest = rest.slice(r.consumed);
        continue;
      }
    }
    if (rest.startsWith("~~")) {
      const r = consumePair(rest, "~~", "line-through text-discord-text-muted");
      if (r) {
        out.push(<Fragment key={key++}>{r.node}</Fragment>);
        rest = rest.slice(r.consumed);
        continue;
      }
    }
    if (rest.startsWith("`")) {
      const r = consumeCode(rest);
      if (r) {
        out.push(<Fragment key={key++}>{r.node}</Fragment>);
        rest = rest.slice(r.consumed);
        continue;
      }
    }
    if (rest.startsWith("*")) {
      const r = consumePair(rest, "*", "italic text-discord-text-normal", "em");
      if (r) {
        out.push(<Fragment key={key++}>{r.node}</Fragment>);
        rest = rest.slice(r.consumed);
        continue;
      }
    }
    if (rest.startsWith("_")) {
      const r = consumePair(rest, "_", "italic text-discord-text-normal", "em");
      if (r) {
        out.push(<Fragment key={key++}>{r.node}</Fragment>);
        rest = rest.slice(r.consumed);
        continue;
      }
    }
    if (rest.startsWith("[")) {
      const r = consumeMarkdownLink(rest);
      if (r) {
        out.push(<Fragment key={key++}>{r.node}</Fragment>);
        rest = rest.slice(r.consumed);
        continue;
      }
    }
    const emoji = consumeEmoji(rest);
    if (emoji) {
      out.push(<Fragment key={key++}>{emoji.node}</Fragment>);
      rest = rest.slice(emoji.consumed);
      continue;
    }
    const mention = consumeMention(rest);
    if (mention) {
      out.push(<Fragment key={key++}>{mention.node}</Fragment>);
      rest = rest.slice(mention.consumed);
      continue;
    }
    const url = consumeUrl(rest);
    if (url) {
      out.push(<Fragment key={key++}>{url.node}</Fragment>);
      rest = rest.slice(url.consumed);
      continue;
    }
    const plain = /^[^<*_`~|[]+/.exec(rest);
    if (plain) {
      out.push(plain[0]);
      rest = rest.slice(plain[0].length);
      continue;
    }
    // Single-char fallback with the `u` flag so multi-byte characters
    // (native emoji, etc.) are never split across surrogate pairs.
    const single = /^[\s\S]/u.exec(rest);
    const ch = single ? single[0] : rest[0];
    out.push(ch);
    rest = rest.slice(ch.length);
  }
  return out;
}

function renderLine(line: string, key: number): ReactNode {
  const h3 = /^###\s+(.+)$/.exec(line);
  if (h3) {
    return (
      <span key={key} className="mt-1 block text-lg font-bold text-discord-header-primary">
        {renderInline(h3[1])}
      </span>
    );
  }
  const h2 = /^##\s+(.+)$/.exec(line);
  if (h2) {
    return (
      <span key={key} className="mt-1 block text-xl font-bold text-discord-header-primary">
        {renderInline(h2[1])}
      </span>
    );
  }
  const h1 = /^#\s+(.+)$/.exec(line);
  if (h1) {
    return (
      <span key={key} className="mt-1 block text-2xl font-bold text-discord-header-primary">
        {renderInline(h1[1])}
      </span>
    );
  }
  const quote = /^>\s?(.*)$/.exec(line);
  if (quote) {
    return (
      <span
        key={key}
        className="my-0.5 block border-l-4 border-discord-interactive-muted pl-3 text-discord-text-normal"
      >
        {renderInline(quote[1])}
      </span>
    );
  }
  return (
    <span key={key} className="block min-h-[1.25em]">
      {renderInline(line)}
    </span>
  );
}

/** Splits on ``` code fences (rendered as <pre>) and renders everything else line-by-line
 * so headings/blockquotes are recognised. Only used in block mode (inline={false}). */
function renderBlocks(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < text.length) {
    if (!text.startsWith("```", i)) {
      const nextFence = text.indexOf("```", i);
      const segment = nextFence === -1 ? text.slice(i) : text.slice(i, nextFence);
      if (segment.length > 0) {
        for (const line of segment.split("\n")) out.push(renderLine(line, key++));
      }
      if (nextFence === -1) break;
      i = nextFence;
      continue;
    }

    const open = i + 3;
    const lineEnd = text.indexOf("\n", open);
    const codeStart = lineEnd !== -1 ? lineEnd + 1 : open;
    const close = text.indexOf("```", codeStart);
    if (close === -1) {
      for (const line of text.slice(i).split("\n")) out.push(renderLine(line, key++));
      break;
    }
    const code = text.slice(codeStart, close).replace(/\n$/, "");
    out.push(
      <pre
        key={key++}
        className="my-1 w-full overflow-x-auto rounded-md bg-discord-bg-secondary p-3 font-mono text-sm leading-snug text-discord-text-normal whitespace-pre-wrap [word-break:break-all]"
      >
        {code}
      </pre>,
    );
    i = close + 3;
  }

  return out;
}

export interface DiscordTextProps {
  text: string | null | undefined;
  className?: string;
  /** Single line, no block code/headings/quotes — for embed titles, button labels, field cells. Defaults to false. */
  inline?: boolean;
  /** Substitute the bot's `{user.mention}`-style placeholders before rendering. Defaults to true. */
  replaceTags?: boolean;
}

export function DiscordText({ text, className, inline = false, replaceTags = true }: DiscordTextProps) {
  const ctx = useDiscordPreviewOptional();
  const normalized = useMemo(() => {
    const raw = (text ?? "").replace(/\r\n/g, "\n");
    return replaceTags ? replacePreviewTags(raw, ctx ?? undefined) : raw;
  }, [text, replaceTags, ctx]);
  const body = useMemo(
    () => (inline ? renderInline(normalized) : renderBlocks(normalized)),
    [normalized, inline],
  );
  if (inline) {
    return <span className={`break-words [word-break:break-word] ${className ?? ""}`}>{body}</span>;
  }
  return (
    <div className={`break-words [word-break:break-word] whitespace-pre-wrap ${className ?? ""}`}>
      {body}
    </div>
  );
}

export { formatTimestamp, TS_FROZEN_NOW };
