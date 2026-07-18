/* eslint-disable @next/next/no-img-element */
"use client";

import { useDiscordPreviewOptional } from "@/contexts/DiscordPreviewContext";
import type { EmbedCustom, EmbedField } from "@/lib/db/types";
import { resolveDiscordColor } from "@/lib/discord/discord-style";
import { replacePreviewTags } from "@/lib/discord/preview-tags";
import { DiscordText } from "./DiscordText";

export interface DiscordEmbedProps {
  embed: EmbedCustom;
}

/** Matches real Discord's embed footer timestamp style, e.g. "7/18/2026 1:32 AM". */
function formatEmbedTimestamp(): string {
  const d = new Date();
  return d.toLocaleString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Group fields into rows like Discord: up to 3 inline per row; block field on its own row. */
function groupEmbedFields(fields: EmbedField[]): EmbedField[][] {
  const rows: EmbedField[][] = [];
  let i = 0;
  while (i < fields.length) {
    const f = fields[i];
    if (!f.inline) {
      rows.push([f]);
      i += 1;
      continue;
    }
    const chunk: EmbedField[] = [];
    while (i < fields.length && fields[i].inline && chunk.length < 3) {
      chunk.push(fields[i]);
      i += 1;
    }
    rows.push(chunk);
  }
  return rows;
}

export function DiscordEmbed({ embed }: DiscordEmbedProps) {
  const ctx = useDiscordPreviewOptional();
  // URL fields may use bot placeholders like {user.avatar} / {guild.icon}.
  const resolveUrl = (url?: string) =>
    url ? replacePreviewTags(url.trim(), ctx ?? undefined) : "";
  const color = resolveDiscordColor(embed.color) || "#1e1f22";
  const showAuthor = Boolean(embed.author?.name);
  const showTitle = Boolean(embed.title);
  const showDescription = Boolean(embed.description);
  const showFooter = Boolean(embed.footer?.text);
  const authorIconUrl = resolveUrl(embed.author?.icon_url);
  const thumbnailUrl = resolveUrl(embed.thumbnail);
  const imageUrl = resolveUrl(embed.image);
  const footerIconUrl = resolveUrl(embed.footer?.icon_url);
  const showThumb = Boolean(thumbnailUrl);
  const showImage = Boolean(imageUrl);
  const showTimestamp = embed.timestamp;
  const fields = embed.fields ?? [];
  const fieldRows = groupEmbedFields(fields);

  return (
    <div
      className="max-w-[520px] rounded-r-md border-l-4 bg-discord-bg-secondary p-3 shadow-sm sm:p-4"
      style={{ borderLeftColor: color }}
    >
      <div className="flex justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          {showAuthor ? (
            <div className="flex items-center gap-2">
              {authorIconUrl ? (
                <img
                  src={authorIconUrl}
                  alt=""
                  className="h-6 w-6 shrink-0 rounded-full object-cover"
                />
              ) : null}
              <span className="text-sm font-semibold text-white">
                <DiscordText inline text={embed.author!.name ?? ""} />
                {embed.author!.url ? (
                  <a
                    href={embed.author!.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 text-discord-link hover:underline"
                  >
                    ↗
                  </a>
                ) : null}
              </span>
            </div>
          ) : null}

          {showTitle ? (
            <div className="text-base font-semibold text-white">
              <DiscordText inline text={embed.title ?? ""} />
            </div>
          ) : null}

          {showDescription ? (
            <div className="text-sm leading-relaxed text-discord-text-normal">
              <DiscordText text={embed.description ?? ""} />
            </div>
          ) : null}

          {fields.length > 0 ? (
            <div className="mt-2 space-y-2">
              {fieldRows.map((row, ri) => {
                const singleBlock = row.length === 1 && !row[0].inline;
                return (
                  <div
                    key={ri}
                    className={
                      singleBlock ? "w-full" : "grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-2"
                    }
                  >
                    {row.map((cell, ci) => (
                      <div key={ci} className="min-w-0 sm:max-w-[200px]">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-discord-text-muted">
                          {cell.name.trim() ? <DiscordText inline text={cell.name} /> : "\u00a0"}
                        </div>
                        <div className="mt-0.5 text-sm leading-snug text-discord-text-normal">
                          {cell.value.trim() ? <DiscordText inline text={cell.value} /> : "\u00a0"}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {showThumb ? (
          <div className="shrink-0">
            <img
              src={thumbnailUrl}
              alt=""
              className="h-20 w-20 rounded object-cover sm:h-24 sm:w-24"
            />
          </div>
        ) : null}
      </div>

      {showImage ? (
        <div className="mt-3 overflow-hidden rounded-md">
          <img
            src={imageUrl}
            alt=""
            className="max-h-[400px] w-auto max-w-full rounded-md object-contain object-left-top"
          />
        </div>
      ) : null}

      {(showFooter || showTimestamp) && (
        <div className="mt-3 flex items-center gap-2 text-xs font-medium text-discord-text-muted">
          {footerIconUrl ? (
            <img
              src={footerIconUrl}
              alt=""
              className="h-5 w-5 shrink-0 rounded-full object-cover"
            />
          ) : null}
          <div className="flex flex-wrap items-center gap-x-1">
            {showFooter ? <DiscordText inline text={embed.footer!.text ?? ""} /> : null}
            {showFooter && showTimestamp ? (
              <span className="mx-0.5 text-discord-interactive-muted">•</span>
            ) : null}
            {showTimestamp ? <span>{formatEmbedTimestamp()}</span> : null}
          </div>
        </div>
      )}
    </div>
  );
}
