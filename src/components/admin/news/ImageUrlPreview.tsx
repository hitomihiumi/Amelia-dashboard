"use client";

import React, { useEffect, useState } from "react";
import { LuImage, LuImageOff } from "react-icons/lu";
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
    <div
      className={`${styles.frame} ${ratio === "cover" ? styles.cover : styles.compact}`}
      data-status={status}
      aria-live="polite"
    >
      {url && status !== "error" && (
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
        <span className={styles.note}>
          <LuImage aria-hidden /> {hint}
        </span>
      )}
      {status === "error" && (
        <span className={`${styles.note} ${styles.noteError}`}>
          <LuImageOff aria-hidden /> {errorText}
        </span>
      )}
      {status === "loading" && <span className={styles.shimmer} aria-hidden />}
    </div>
  );
}
