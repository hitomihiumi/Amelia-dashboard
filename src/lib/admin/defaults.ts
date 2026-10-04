/**
 * Config constants that client components need too. `config.ts` is server-only
 * (it talks to the database), so everything the settings form shares with the
 * server lives here.
 */

/** Fallbacks for a site that has never opened the admin panel. */
export const CONFIG_DEFAULTS = {
  inviteUrl:
    "https://discord.com/oauth2/authorize?client_id=1356347611283591218&scope=bot+applications.commands&permissions=295749283071",
  githubUrl: "https://github.com/hitomihiumi/Amelia",
  heroTagline: "Open Source",
  heroText: "Your handy assistant for improving and customizing your Discord guild!",
} as const;

export type ServiceOverride = { status?: string; note?: string | null };

export const BANNER_VARIANTS = ["info", "warning", "danger", "success"] as const;
export type BannerVariant = (typeof BANNER_VARIANTS)[number];

export const SERVICE_KEYS = ["gateway", "database", "website", "shards"] as const;
export type ServiceKeyName = (typeof SERVICE_KEYS)[number];

export const SERVICE_STATUSES = ["operational", "degraded", "down", "maintenance"] as const;
export type ServiceStatusName = (typeof SERVICE_STATUSES)[number];

/** Maximum lengths, enforced by the form and again by the server action. */
export const CONFIG_LIMITS = {
  bannerText: 300,
  url: 500,
  heroTagline: 120,
  heroText: 400,
  maintenanceMessage: 300,
  serviceNote: 200,
} as const;

const URL_PATTERN = /^https?:\/\/\S+$/i;

/** Same rule the server applies: an absolute http(s) link without spaces. */
export function isValidLink(value: string): boolean {
  return URL_PATTERN.test(value.trim());
}

/** Colour family used for a service status or banner variant. */
export type Tone = "success" | "warning" | "danger" | "info" | "neutral";

export const STATUS_TONE: Record<ServiceStatusName, Tone> = {
  operational: "success",
  degraded: "warning",
  down: "danger",
  maintenance: "info",
};
