"use client";

import { Analytics } from "@vercel/analytics/next";
import { useCookieConsent } from "./CookieConsent";

/** Usage statistics are only collected after the visitor has opted in. */
export function ConsentAnalytics() {
  const { consent } = useCookieConsent();

  return consent?.analytics ? <Analytics /> : null;
}
