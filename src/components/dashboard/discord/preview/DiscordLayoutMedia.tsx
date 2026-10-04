/* eslint-disable @next/next/no-img-element */
"use client";

import { useDiscordPreviewOptional } from "@/contexts/DiscordPreviewContext";
import { useT } from "@/i18n/client";
import type { LayoutGalleryItem } from "@/lib/db/types";
import { replacePreviewTags } from "@/lib/discord/preview-tags";
import { cn } from "@/lib/utils";
import { type ReactNode, useEffect, useState } from "react";
import { LuImageOff } from "react-icons/lu";

const VIDEO_URL = /\.(mp4|webm|mov|m4v)(?:[?#].*)?$/i;

/** Resolves `{user.avatar}` and friends the way the bot does when the message is sent. */
export function useResolveMediaUrl(): (url: string | undefined) => string {
  const ctx = useDiscordPreviewOptional();
  return (url) => (url ? replacePreviewTags(url.trim(), ctx ?? undefined) : "");
}

interface PreviewMediaProps {
  url: string;
  description?: string;
  spoiler?: boolean;
  /** The media fills a box of fixed proportions, instead of keeping its own. */
  fill?: boolean;
  className?: string;
  /** Round the corners itself (a lone thumbnail). Gallery cells are clipped by their grid instead. */
  rounded?: boolean;
}

/** An image or video with Discord's spoiler blur, ALT badge and a placeholder when it fails to load. */
export function PreviewMedia({
  url,
  description,
  spoiler,
  fill = false,
  className,
  rounded = false,
}: PreviewMediaProps) {
  const t = useT();
  const resolve = useResolveMediaUrl();
  const src = resolve(url);
  const [failed, setFailed] = useState(false);
  const [revealed, setRevealed] = useState(false);

  // A new url deserves a new attempt.
  useEffect(() => setFailed(false), [src]);

  const hidden = Boolean(spoiler) && !revealed;
  const isVideo = VIDEO_URL.test(src);

  let media: ReactNode;
  if (!src || failed) {
    media = (
      <div
        className={cn(
          "flex min-h-20 flex-col items-center justify-center gap-1 bg-discord-bg-tertiary px-2 text-center text-xs text-discord-text-muted",
          fill ? "absolute inset-0" : "aspect-video w-full",
        )}
      >
        <LuImageOff size={20} aria-hidden />
        <span>{src ? t("layouts.preview.mediaFailed") : t("layouts.preview.mediaEmpty")}</span>
      </div>
    );
  } else if (isVideo) {
    media = (
      <video
        src={src}
        muted
        playsInline
        preload="metadata"
        aria-label={description || undefined}
        onError={() => setFailed(true)}
        className={cn(
          "block w-full object-cover",
          fill ? "absolute inset-0 h-full" : "max-h-[350px]",
          hidden && "scale-110 blur-xl",
        )}
      />
    );
  } else {
    media = (
      <img
        src={src}
        alt={description ?? ""}
        loading="lazy"
        onError={() => setFailed(true)}
        className={cn(
          "block w-full object-cover",
          fill ? "absolute inset-0 h-full" : "max-h-[350px]",
          hidden && "scale-110 blur-xl",
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-discord-bg-tertiary",
        rounded && "rounded-lg",
        className,
      )}
    >
      {media}
      {description && !hidden && src && !failed ? (
        <span
          title={description}
          className="absolute bottom-1.5 left-1.5 rounded bg-discord-bg-floating/80 px-1.5 py-px text-[10px] font-bold leading-4 text-discord-header-primary"
        >
          ALT
        </span>
      ) : null}
      {hidden && src && !failed ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setRevealed(true);
          }}
          className="absolute inset-0 flex cursor-pointer items-center justify-center"
          aria-label={t("layouts.preview.revealSpoiler")}
        >
          <span className="rounded-full bg-discord-bg-floating/80 px-3 py-1 text-xs font-bold uppercase tracking-wide text-discord-header-primary">
            {t("layouts.preview.spoiler")}
          </span>
        </button>
      ) : null}
    </div>
  );
}

/** Row sizes of Discord's media mosaic; three images are laid out separately. */
const MOSAIC_ROWS: Record<number, number[]> = {
  1: [1],
  2: [2],
  4: [2, 2],
  5: [2, 3],
  6: [3, 3],
  7: [1, 3, 3],
  8: [2, 3, 3],
  9: [3, 3, 3],
  10: [1, 3, 3, 3],
};

/** Discord's media gallery: one image full width, two side by side, three as one big and two small, and so on. */
export function PreviewGallery({ items }: { items: LayoutGalleryItem[] }) {
  const shown = items.slice(0, 10);
  if (shown.length === 0) return null;

  const cell = (item: LayoutGalleryItem, key: number, className?: string) => (
    <PreviewMedia
      key={key}
      url={item.url}
      description={item.description}
      spoiler={item.spoiler}
      fill
      className={className}
    />
  );

  if (shown.length === 1) {
    const [item] = shown;
    return (
      <PreviewMedia
        url={item.url}
        description={item.description}
        spoiler={item.spoiler}
        rounded
        className="w-full"
      />
    );
  }

  if (shown.length === 3) {
    return (
      <div className="grid aspect-[4/3] w-full grid-cols-2 grid-rows-2 gap-1 overflow-hidden rounded-lg">
        {cell(shown[0], 0, "row-span-2")}
        {cell(shown[1], 1)}
        {cell(shown[2], 2)}
      </div>
    );
  }

  const rows = MOSAIC_ROWS[shown.length] ?? [shown.length];
  let cursor = 0;

  return (
    <div className="flex w-full flex-col gap-1 overflow-hidden rounded-lg">
      {rows.map((size, rowIndex) => {
        const row = shown.slice(cursor, cursor + size);
        cursor += size;
        return (
          <div key={rowIndex} className="flex gap-1">
            {row.map((item, i) =>
              cell(item, i, cn("flex-1", size === 1 ? "aspect-[2/1]" : "aspect-square")),
            )}
          </div>
        );
      })}
    </div>
  );
}
