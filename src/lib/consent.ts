/**
 * Cookie consent state. Stored in a first-party cookie so the server can read it too:
 * the layout then knows on the first byte whether to show the banner, and whether the
 * analytics script may be rendered at all.
 */
export const CONSENT_COOKIE = "amelia-consent";

/** Bump when the categories change, so everyone is asked again. */
export const CONSENT_VERSION = 1;

/** How long a choice is remembered. */
export const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

export interface ConsentState {
  v: number;
  /** Anonymous usage statistics (Vercel Web Analytics). Off until the visitor opts in. */
  analytics: boolean;
  /** When the choice was made, ms since epoch. */
  t: number;
}

export function parseConsent(raw: string | null | undefined): ConsentState | null {
  if (!raw) return null;

  try {
    const value = JSON.parse(decodeURIComponent(raw)) as Partial<ConsentState>;
    if (value.v !== CONSENT_VERSION || typeof value.analytics !== "boolean") return null;

    return { v: CONSENT_VERSION, analytics: value.analytics, t: Number(value.t) || 0 };
  } catch {
    return null;
  }
}

export function serializeConsent(state: ConsentState): string {
  return encodeURIComponent(JSON.stringify(state));
}
