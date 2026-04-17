import { signIn } from "next-auth/react";

export const DISCORD_OAUTH_MESSAGE_TYPE = "amelia:discord-oauth-done" as const;

export type DiscordOAuthPopupMessage = {
  type: typeof DISCORD_OAUTH_MESSAGE_TYPE;
  next?: string;
};

export function isSafeAfterLoginPath(path: string | null | undefined): path is string {
  if (!path || !path.startsWith("/") || path.startsWith("//") || path.includes("://")) return false;
  return true;
}

const NEXT_AUTH_BASE = "/api/auth";

function isDiscordOAuthUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.hostname === "discord.com" || u.hostname.endsWith(".discord.com");
  } catch {
    return false;
  }
}

async function fetchDiscordAuthorizeUrl(callbackUrl: string): Promise<string | null> {
  const origin = window.location.origin;

  const csrfRes = await fetch(`${origin}${NEXT_AUTH_BASE}/csrf`, { credentials: "include" });
  if (!csrfRes.ok) return null;
  const { csrfToken } = await csrfRes.json();
  if (!csrfToken) return null;

  const res = await fetch(`${origin}${NEXT_AUTH_BASE}/signin/discord`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ csrfToken, callbackUrl, json: "true" }),
    credentials: "include",
    redirect: "manual",
  });

  const raw = await res.text();
  try {
    const data = JSON.parse(raw) as { url?: string };
    if (data.url && isDiscordOAuthUrl(data.url)) return data.url;
  } catch {}

  const loc = res.headers.get("Location");
  if (loc && isDiscordOAuthUrl(loc)) return loc;

  return null;
}

export async function openDiscordOAuthPopup(options?: { next?: string }): Promise<Window | null> {
  if (typeof window === "undefined") return null;

  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    window.innerWidth <= 768;

  const closeUrl = new URL("/login/oauth-popup-close", window.location.origin);
  if (options?.next && isSafeAfterLoginPath(options.next)) {
    closeUrl.searchParams.set("next", options.next);
  }

  if (isMobile) {
    void signIn("discord", { callbackUrl: closeUrl.toString() });
    return null;
  }

  const w = 520,
    h = 720;
  const left = Math.max(0, window.screenX + (window.outerWidth - w) / 2);
  const top = Math.max(0, window.screenY + (window.outerHeight - h) / 2);

  let popup: Window | null = null;
  if (!isMobile) {
    popup = window.open(
      "about:blank",
      `amelia-oauth-${Date.now()}`,
      `width=${w},height=${h},left=${left},top=${top},scrollbars=yes,resizable=yes`,
    );
  }

  const discordUrl = await fetchDiscordAuthorizeUrl(closeUrl.toString()).catch(() => null);

  if (!discordUrl) {
    popup?.close();
    return null;
  }

  if (popup) {
    try {
      popup.location.href = discordUrl;
      popup.focus();
      return popup;
    } catch {
      popup.close();
      window.location.href = discordUrl;
      return null;
    }
  }

  window.location.href = discordUrl;
  return null;
}
