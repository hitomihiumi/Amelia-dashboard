"use client";

import React, { useEffect, useState } from "react";
import { LuImage, LuImageOff } from "react-icons/lu";
import { Flex, Row } from "@once-ui-system/core";
import styles from "./ImageUrlPreview.module.scss";

export type ImageStatus = "idle" | "loading" | "ok" | "error";

interface ImageUrlPreviewProps {
  /** Empty string means "nothing to preview". */
  url: string;
  hint: string;
  errorText: string;
  onStatus?: (status: ImageStatus) => void;
  /** Visual shape: a wide 16:9 cover frame or a compact thumbnail. */
  ratio?: "cover" | "compact";
}

/** Live preview of an image address with loading and broken-image states. */
export function ImageUrlPreview({ url, hint, errorText, onStatus, ratio = "compact" }: ImageUrlPreviewProps) {
  const [status, setStatus] = useState<ImageStatus>(url ? "loading" : "idle");
  const [shownUrl, setShownUrl] = useState(url);

  // Reset while typing, before the next image has had a chance to load.
  if (shownUrl !== url) {
    setShownUrl(url);
    setStatus(url ? "loading" : "idle");
  }

  useEffect(() => {
    onStatus?.(status);
  }, [status, onStatus]);

  return (
    <Row
      fillWidth
      center
      overflow="hidden"
      radius="m"
      border={status === "error" ? "danger-alpha-medium" : "neutral-alpha-medium"}
      borderStyle={status === "ok" ? "solid" : "dashed"}
      background={status === "error" ? "danger-alpha-weak" : "neutral-alpha-weak"}
      onBackground="neutral-weak"
      aspectRatio={ratio === "cover" ? "16 / 9" : undefined}
      height={ratio === "cover" ? undefined : 7}
      data-status={status}
      aria-live="polite"
    >
      {url && status !== "error" && (
        // A plain <img>: the load / error events decide the status above, and Media does not expose them.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={url}
          src={url}
          alt=""
          className={styles.img}
          onLoad={() => setStatus("ok")}
          onError={() => setStatus("error")}
        />
      )}
      {status === "idle" && (
        <Row center gap="8" paddingX="12" paddingY="8" textVariant="body-default-s" align="center">
          <LuImage aria-hidden /> {hint}
        </Row>
      )}
      {status === "error" && (
        <Row
          center
          gap="8"
          paddingX="12"
          paddingY="8"
          textVariant="body-default-s"
          align="center"
          onBackground="danger-strong"
        >
          <LuImageOff aria-hidden /> {errorText}
        </Row>
      )}
      {status === "loading" && (
        <Flex position="absolute" top="0" left="0" fill pointerEvents="none" aria-hidden className={styles.shimmer} />
      )}
    </Row>
  );
}
