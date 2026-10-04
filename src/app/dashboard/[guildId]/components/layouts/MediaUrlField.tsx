/* eslint-disable @next/next/no-img-element */
"use client";

import { useDiscordPreviewOptional } from "@/contexts/DiscordPreviewContext";
import { useT } from "@/i18n/client";
import { replacePreviewTags } from "@/lib/discord/preview-tags";
import { Column, Input, Row, Text } from "@once-ui-system/core";
import { useEffect, useState } from "react";
import { LuImage, LuImageOff, LuVideo } from "react-icons/lu";

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
    <Row
      center
      overflow="hidden"
      border={status === "error" ? "danger-strong" : status === "ok" || status === "video" ? "success-medium" : "neutral-medium"}
      radius="s"
      background="neutral-alpha-weak"
      onBackground={status === "error" ? "danger-strong" : "neutral-weak"}
      style={{ width: 56, height: 56, flexShrink: 0 }}
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
        // A native <img>: the thumbnail needs onLoad/onError for links on any host, which `Media`
        // (next/image) cannot report.
        <img
          src={src}
          alt=""
          onLoad={() => setStatus("ok")}
          onError={() => setStatus("error")}
          style={{ width: "100%", height: "100%", objectFit: "cover", opacity: status === "ok" ? 1 : 0.4 }}
        />
      )}
    </Row>
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
    <Row fillWidth gap="12" minWidth="0" vertical="start">
      <MediaThumb url={value} />
      <Column flex="1" gap="8" minWidth="0">
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
      </Column>
    </Row>
  );
}
