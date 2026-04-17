"use client";

import { useEffect, useRef } from "react";

import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";

function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

export function UnsavedNavigationGuard() {
  const { isDirty, onBlockedNavigationAttempt } = useUnsavedChanges();
  const isDirtyRef = useLatest(isDirty);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!isDirtyRef.current) return;
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const el = e.target;
      if (!(el instanceof Element)) return;

      const anchor = el.closest("a[href]");
      if (!anchor) return;
      if (anchor.hasAttribute("download")) return;
      if (anchor.getAttribute("target") === "_blank") return;

      const hrefAttr = anchor.getAttribute("href");
      if (!hrefAttr || hrefAttr === "#" || hrefAttr.startsWith("#")) return;

      let nextUrl: URL;
      try {
        nextUrl = new URL(hrefAttr, window.location.href);
      } catch {
        return;
      }

      if (nextUrl.protocol !== "http:" && nextUrl.protocol !== "https:") {
        return;
      }

      const cur = new URL(window.location.href);
      if (
        nextUrl.pathname === cur.pathname &&
        nextUrl.search === cur.search &&
        nextUrl.hash !== cur.hash
      ) {
        return;
      }
      if (
        nextUrl.pathname === cur.pathname &&
        nextUrl.search === cur.search &&
        nextUrl.hash === cur.hash
      ) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      onBlockedNavigationAttempt();
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [isDirtyRef, onBlockedNavigationAttempt]);

  return null;
}
