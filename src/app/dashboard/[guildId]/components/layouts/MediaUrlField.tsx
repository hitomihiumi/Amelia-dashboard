/* eslint-disable @next/next/no-img-element */
"use client";

import { useDiscordPreviewOptional } from "@/contexts/DiscordPreviewContext";
import { useT } from "@/i18n/client";
import { replacePreviewTags } from "@/lib/discord/preview-tags";
import { Input, Text } from "@once-ui-system/core";
import { useEffect, useState } from "react";
import { LuImage, LuImageOff, LuVideo } from "react-icons/lu";
import styles from "./LayoutEditor.module.scss";

const VIDEO_URL = /\.(mp4|webm|mov|m4v)(?:[?#].*)?$/i;

type Status = "empty" | "loading" | "ok" | "error" | "video";

/** A thumbnail that tells at a glance whether the link points at something Discord can show. */
function MediaThumb({ url }: { url: string }) {
  const t = useT();
  const ctx = useDiscordPreviewOptional();
  const resolved = url.trim() ? replacePreviewTags(url.trim(), ctx ?? undefined) : "";

  // Typing stays instant: the image is only requested once the link has settled.
  const [src, setSrc] = useState(resolved);
  const [status, setStatus] = useState<Status>(resolved ? "loading" : "empty");

  useEffect(() => {
    if (!resolved) {
      setSrc("");
      setStatus("empty");
      return;
    }
    const timer = setTimeout(() => {
      setSrc(resolved);
      setStatus(VIDEO_URL.test(resolved) ? "video" : "loading");
    }, 350);
    return () => clearTimeout(timer);
  }, [resolved]);

  return (
    <div
      className={styles.thumb}
      data-status={status === "video" ? "ok" : status}
      title={
        status === "error"
          ? t("layouts.media.failed")
          : status === "ok"
            ? t("layouts.media.ok")
            : undefined
      }
    >
      {status === "empty" ? (
        <LuImage size={20} aria-hidden />
      ) : status === "video" ? (
        <LuVideo size={20} aria-hidden />
      ) : status === "error" ? (
        <LuImageOff size={20} aria-hidden />
      ) : (
        <img
          src={src}
          alt=""
          onLoad={() => setStatus("ok")}
          onError={() => setStatus("error")}
          style={{ opacity: status === "ok" ? 1 : 0.4 }}
        />
      )}
    </div>
  );
}

export interface MediaUrlFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  placeholder?: string;
  label: string;
}

/** Link input with an instant thumbnail check. Used for gallery items and section thumbnails. */
export function MediaUrlField({ id, value, onChange, invalid, label, placeholder }: MediaUrlFieldProps) {
  const t = useT();
  const hasPlaceholder = /\{[a-zA-Z][\w.]*\}/.test(value);

  return (
    <div className={styles.mediaRow}>
      <MediaThumb url={value} />
      <div className={styles.mediaFields}>
        <Input
          id={id}
          label={label}
          placeholder={placeholder ?? "https://…"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          error={invalid}
          maxLength={2000}
          inputMode="url"
          autoComplete="off"
        />
        {hasPlaceholder ? (
          <Text variant="body-default-xs" onBackground="neutral-weak" paddingX="4">
            {t("layouts.media.placeholderNote")}
          </Text>
        ) : null}
      </div>
    </div>
  );
}
