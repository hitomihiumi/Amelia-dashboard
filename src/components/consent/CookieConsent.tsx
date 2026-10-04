"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE_SECONDS,
  CONSENT_VERSION,
  type ConsentState,
  serializeConsent,
} from "@/lib/consent";

interface CookieConsentContextValue {
  /** `null` until the visitor has made a choice. */
  consent: ConsentState | null;
  /** The banner is showing: first visit, or the visitor asked to change the choice. */
  bannerOpen: boolean;
  acceptAll: () => void;
  rejectOptional: () => void;
  save: (choice: { analytics: boolean }) => void;
  openSettings: () => void;
}

const CookieConsentContext = createContext<CookieConsentContextValue | null>(null);

function writeCookie(state: ConsentState) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${serializeConsent(state)}; Path=/; Max-Age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}

/** `initial` comes from the cookie, read on the server, so returning visitors never see a flash of the banner. */
export function CookieConsentProvider({
  initial,
  children,
}: {
  initial: ConsentState | null;
  children: React.ReactNode;
}) {
  const [consent, setConsent] = useState<ConsentState | null>(initial);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const commit = useCallback((analytics: boolean) => {
    const next: ConsentState = { v: CONSENT_VERSION, analytics, t: Date.now() };
    writeCookie(next);
    setConsent(next);
    setSettingsOpen(false);
  }, []);

  const value = useMemo<CookieConsentContextValue>(
    () => ({
      consent,
      bannerOpen: consent === null || settingsOpen,
      acceptAll: () => commit(true),
      rejectOptional: () => commit(false),
      save: ({ analytics }) => commit(analytics),
      openSettings: () => setSettingsOpen(true),
    }),
    [consent, settingsOpen, commit],
  );

  return <CookieConsentContext.Provider value={value}>{children}</CookieConsentContext.Provider>;
}

export function useCookieConsent(): CookieConsentContextValue {
  const context = useContext(CookieConsentContext);
  if (!context) throw new Error("useCookieConsent must be used inside <CookieConsentProvider>");
  return context;
}
