import {
  BANNER_VARIANTS,
  CONFIG_DEFAULTS,
  isValidLink,
  SERVICE_KEYS,
  type ServiceOverride,
} from "@/lib/admin/defaults";

/** The part of the stored config the form edits; the Prisma row satisfies it. */
export interface ConfigValues {
  bannerEnabled: boolean;
  bannerText: string | null;
  bannerVariant: string;
  inviteUrl: string | null;
  supportUrl: string | null;
  githubUrl: string | null;
  heroTagline: string | null;
  heroText: string | null;
  maintenance: boolean;
  maintenanceMessage: string | null;
}

/** Same shape that is sent to `updateGlobalConfig` as JSON. */
export interface FormState {
  bannerEnabled: boolean;
  bannerText: string;
  bannerVariant: string;
  inviteUrl: string;
  supportUrl: string;
  githubUrl: string;
  heroTagline: string;
  heroText: string;
  maintenance: boolean;
  maintenanceMessage: string;
  serviceOverrides: Record<string, ServiceOverride>;
}

export type SectionId = "banner" | "links" | "landing" | "status";

export const SECTION_FIELDS: Record<SectionId, (keyof FormState)[]> = {
  banner: ["bannerEnabled", "bannerText", "bannerVariant"],
  links: ["inviteUrl", "supportUrl", "githubUrl"],
  landing: ["heroTagline", "heroText"],
  status: ["maintenance", "maintenanceMessage", "serviceOverrides"],
};

export const LINK_FIELDS = ["inviteUrl", "supportUrl", "githubUrl"] as const;
export type LinkField = (typeof LINK_FIELDS)[number];

export function toFormState(
  config: ConfigValues,
  overrides: Record<string, ServiceOverride>,
): FormState {
  return {
    bannerEnabled: config.bannerEnabled,
    bannerText: config.bannerText ?? "",
    bannerVariant: (BANNER_VARIANTS as readonly string[]).includes(config.bannerVariant)
      ? config.bannerVariant
      : "warning",
    inviteUrl: config.inviteUrl ?? "",
    supportUrl: config.supportUrl ?? "",
    githubUrl: config.githubUrl ?? "",
    heroTagline: config.heroTagline ?? "",
    heroText: config.heroText ?? "",
    maintenance: config.maintenance,
    maintenanceMessage: config.maintenanceMessage ?? "",
    serviceOverrides: cleanOverrides(overrides),
  };
}

/** Drops entries that mean "trust the measurement" and trims the notes. */
function cleanOverrides(overrides: Record<string, ServiceOverride>): Record<string, ServiceOverride> {
  const clean: Record<string, ServiceOverride> = {};

  for (const key of SERVICE_KEYS) {
    const entry = overrides[key];
    if (!entry?.status) continue;
    clean[key] = { status: entry.status, note: entry.note?.trim() || null };
  }

  return clean;
}

/** What gets saved: every text trimmed, overrides cleaned. */
export function normalize(state: FormState): FormState {
  return {
    ...state,
    bannerText: state.bannerText.trim(),
    inviteUrl: state.inviteUrl.trim(),
    supportUrl: state.supportUrl.trim(),
    githubUrl: state.githubUrl.trim(),
    heroTagline: state.heroTagline.trim(),
    heroText: state.heroText.trim(),
    maintenanceMessage: state.maintenanceMessage.trim(),
    serviceOverrides: cleanOverrides(state.serviceOverrides),
  };
}

/** Sections whose values differ from the saved ones. */
export function dirtySections(state: FormState, baseline: FormState): Set<SectionId> {
  const current = normalize(state);
  const saved = normalize(baseline);
  const dirty = new Set<SectionId>();

  for (const [section, fields] of Object.entries(SECTION_FIELDS) as [
    SectionId,
    (keyof FormState)[],
  ][]) {
    const pick = (value: FormState) => JSON.stringify(fields.map((field) => value[field]));
    if (pick(current) !== pick(saved)) dirty.add(section);
  }

  return dirty;
}

export type LinkState = "empty" | "valid" | "invalid";

export function linkState(value: string): LinkState {
  const trimmed = value.trim();
  if (!trimmed) return "empty";
  return isValidLink(trimmed) ? "valid" : "invalid";
}

export function linkHost(value: string): string {
  try {
    return new URL(value.trim()).host;
  } catch {
    return "";
  }
}

/** A hero text counts as the built-in wording when empty or identical to the default. */
export const isDefaultCopy = (value: string, key: "heroTagline" | "heroText") =>
  !value.trim() || value.trim() === CONFIG_DEFAULTS[key];
