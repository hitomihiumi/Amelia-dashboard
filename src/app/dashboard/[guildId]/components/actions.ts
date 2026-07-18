"use server";

import { requireGuildAdmin } from "@/app/dashboard/[guildId]/actions";
import { authOptions } from "@/lib/auth";
import { Guild } from "@/lib/db/Guild";
import {
  type ButtonCustom,
  type EmbedCustom,
  type IModalField,
  type ModalCustom,
  SCENARIO_LIMITS,
  type SelectMenuCustom,
  type SelectMenuOptionCustom,
} from "@/lib/db/types";
import type { GuildActionState } from "@/types/dashboard";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

const BUTTON_STYLES = new Set(["PRIMARY", "SECONDARY", "SUCCESS", "DANGER", "LINK"]);
const LINK_URL_RE = /^https?:\/\//i;
const DISCORD_ID_MAX = 100;

function fail(error: string): GuildActionState {
  return { ok: false, error };
}

export async function updateComponents(
  guildId: string,
  formData: FormData,
): Promise<GuildActionState> {
  const session = await getServerSession(authOptions);
  if (!session) return fail("Not authorized.");

  const gate = await requireGuildAdmin(guildId);
  if (gate.error) return fail(gate.error);

  const raw = formData.get("components");
  if (!raw) return fail("Missing data");

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw as string);
  } catch {
    return fail("Invalid data format");
  }
  if (!parsed || typeof parsed !== "object") return fail("Invalid components payload");

  const data = parsed as {
    modals?: ModalCustom[];
    embed?: EmbedCustom[];
    buttons?: ButtonCustom[];
    selectMenus?: SelectMenuCustom[];
  };

  const errors: string[] = [];

  const modals = Array.isArray(data.modals) ? data.modals : [];
  const embeds = Array.isArray(data.embed) ? data.embed : [];
  const buttons = Array.isArray(data.buttons) ? data.buttons : [];
  const selectMenus = Array.isArray(data.selectMenus) ? data.selectMenus : [];

  checkUniqueIds("modal", modals, errors);
  checkUniqueIds("embed", embeds, errors);
  checkUniqueIds("button", buttons, errors);
  checkUniqueIds("selectMenu", selectMenus, errors);

  modals.forEach((m, i) => validateModal(m, i, errors));
  embeds.forEach((e, i) => validateEmbed(e, i, errors));
  buttons.forEach((b, i) => validateButton(b, i, errors));
  selectMenus.forEach((s, i) => validateSelectMenu(s, i, errors));

  if (errors.length > 0) {
    return fail("Validation failed:\n" + errors.join("\n"));
  }

  const guild = new Guild(guildId);
  // Only touch the four custom-component collections; preserve scenarios untouched.
  await guild.set("utils.components.modals", modals);
  await guild.set("utils.components.embed", embeds);
  await guild.set("utils.components.buttons", buttons);
  await guild.set("utils.components.selectMenus", selectMenus);
  revalidatePath(`/dashboard/${guildId}/components`);
  return { ok: true };
}

function checkUniqueIds(label: string, items: { id?: string }[], errors: string[]) {
  const seen = new Set<string>();
  for (const item of items) {
    if (!item.id || typeof item.id !== "string") {
      errors.push(`${label}: an item is missing an id`);
      continue;
    }
    if (seen.has(item.id)) errors.push(`${label}: duplicate id "${item.id}"`);
    seen.add(item.id);
  }
}

function validateModal(m: ModalCustom, i: number, errors: string[]) {
  const ctx = `modal[${i}] "${m.id}"`;
  if (!m.title || m.title.length === 0 || m.title.length > 45) {
    errors.push(`${ctx}: title must be between 1 and 45 characters`);
  }
  if (!Array.isArray(m.fields)) {
    errors.push(`${ctx}: fields must be an array`);
    return;
  }
  if (m.fields.length > 5) errors.push(`${ctx}: modals may have at most 5 fields`);
  const fieldIds = new Set<string>();
  for (const [fi, fRaw] of m.fields.entries()) {
    const f = fRaw as IModalField;
    const fctx = `${ctx} field[${fi}]`;
    if (!f.id || typeof f.id !== "string") errors.push(`${fctx}: missing field id`);
    else if (fieldIds.has(f.id)) errors.push(`${fctx}: duplicate field id`);
    else fieldIds.add(f.id);
    if (!f.name || f.name.length === 0 || f.name.length > 45)
      errors.push(`${fctx}: label must be 1-45 characters`);
    if (f.type !== "short" && f.type !== "long") errors.push(`${fctx}: invalid type`);
    if (f.placeholder && f.placeholder.length > 100)
      errors.push(`${fctx}: placeholder exceeds 100 characters`);
    if (typeof f.min === "number") {
      if (f.min < 0 || f.min > DISCORD_ID_MAX)
        errors.push(`${fctx}: min must be 0-${DISCORD_ID_MAX}`);
      if (f.min < 0) errors.push(`${fctx}: min cannot be negative`);
    }
    if (typeof f.max === "number") {
      if (f.max < 0 || f.max > 4000) errors.push(`${fctx}: max must be 0-4000`);
    }
    if (typeof f.min === "number" && typeof f.max === "number" && f.max > 0 && f.min > f.max) {
      errors.push(`${fctx}: min cannot exceed max`);
    }
    if (typeof f.required !== "boolean") errors.push(`${fctx}: required must be boolean`);
  }
}

function validateEmbed(e: EmbedCustom, i: number, errors: string[]) {
  const ctx = `embed[${i}] "${e.name || e.id}"`;
  if (e.title && e.title.length > 256) errors.push(`${ctx}: title cannot exceed 256 characters`);
  if (e.description && e.description.length > 4096)
    errors.push(`${ctx}: description cannot exceed 4096 characters`);
  if (e.color != null) {
    const c = e.color as unknown;
    const valid =
      typeof c === "number" ||
      (typeof c === "string" &&
        (/^#?[0-9a-fA-F]{3,6}$/.test(c.replace(/^#/, "")) ||
          NAMED_DISCORD_COLORS[c.toUpperCase()] != null));
    if (!valid) errors.push(`${ctx}: invalid color "${String(c)}"`);
  }
  if (e.author) {
    if (e.author.name && e.author.name.length > 256)
      errors.push(`${ctx}: author name exceeds 256 characters`);
    if (e.author.icon_url && !LINK_URL_RE.test(e.author.icon_url))
      errors.push(`${ctx}: author icon_url must be http(s)`);
    if (e.author.url && !LINK_URL_RE.test(e.author.url))
      errors.push(`${ctx}: author url must be http(s)`);
  }
  if (e.image && !LINK_URL_RE.test(e.image)) errors.push(`${ctx}: image must be http(s)`);
  if (e.thumbnail && !LINK_URL_RE.test(e.thumbnail))
    errors.push(`${ctx}: thumbnail must be http(s)`);
  if (e.footer) {
    if (e.footer.text && e.footer.text.length > 2048)
      errors.push(`${ctx}: footer text exceeds 2048 characters`);
    if (e.footer.icon_url && !LINK_URL_RE.test(e.footer.icon_url))
      errors.push(`${ctx}: footer icon_url must be http(s)`);
  }
  if (e.fields && Array.isArray(e.fields)) {
    if (e.fields.length > SCENARIO_LIMITS.MAX_EMBED_FIELDS)
      errors.push(`${ctx}: embeds may have at most ${SCENARIO_LIMITS.MAX_EMBED_FIELDS} fields`);
    for (const [fi, f] of e.fields.entries()) {
      const fctx = `${ctx} field[${fi}]`;
      if (!f.name || f.name.length === 0 || f.name.length > 256)
        errors.push(`${fctx}: name must be 1-256 characters`);
      if (!f.value || f.value.length === 0 || f.value.length > 1024)
        errors.push(`${fctx}: value must be 1-1024 characters`);
    }
  }
}

const NAMED_DISCORD_COLORS: Record<string, string> = {
  DEFAULT: "#1e1f22",
  WHITE: "#ffffff",
  AQUA: "#1abc9c",
  GREEN: "#1abc9c",
  BLUE: "#3498db",
  YELLOW: "#f1c40f",
  PURPLE: "#9b59b6",
  LUMINOUS_VIVID_PINK: "#e91e63",
  FUCHSIA: "#e91e63",
  GOLD: "#f1c40f",
  ORANGE: "#e67e22",
  RED: "#e74c3c",
  GREY: "#95a5a6",
  NAVY: "#34495e",
  DARK_AQUA: "#11806a",
  DARK_GREEN: "#1f8b4c",
  DARK_BLUE: "#206694",
  DARK_PURPLE: "#71368a",
  DARK_VIVID_PINK: "#ad1457",
  DARK_GOLD: "#c27c0e",
  DARK_ORANGE: "#a84300",
  DARK_RED: "#992d22",
  DARK_GREY: "#979c9f",
  DARKER_GREY: "#7f8c8d",
  LIGHT_GREY: "#bccbfc",
  DARK_NAVY: "#2c3e50",
  BLURPLE: "#5865f2",
  GREYPLE: "#99aab5",
  DARK_BUT_NOT_BLACK: "#2c2f33",
  NOT_QUITE_BLACK: "#23272a",
};

function validateButton(b: ButtonCustom, i: number, errors: string[]) {
  const ctx = `button[${i}] "${b.name || b.id}"`;
  if (!b.label || b.label.length === 0 || b.label.length > 80)
    errors.push(`${ctx}: label must be 1-80 characters`);
  if (!BUTTON_STYLES.has(b.style)) errors.push(`${ctx}: invalid style "${b.style}"`);
  if (b.style === "LINK" && !b.url) errors.push(`${ctx}: LINK buttons require a url`);
  if (b.style === "LINK" && b.url && !LINK_URL_RE.test(b.url)) errors.push(`${ctx}: invalid url`);
  if (b.style !== "LINK" && b.url) errors.push(`${ctx}: only LINK buttons may have a url`);
}

function validateSelectMenu(s: SelectMenuCustom, i: number, errors: string[]) {
  const ctx = `selectMenu[${i}] "${s.name || s.id}"`;
  if (s.placeholder && s.placeholder.length > 150)
    errors.push(`${ctx}: placeholder cannot exceed 150 characters`);
  if (s.minValues != null && (s.minValues < 0 || s.minValues > 25))
    errors.push(`${ctx}: minValues must be 0-25`);
  if (s.maxValues != null && (s.maxValues < 1 || s.maxValues > 25))
    errors.push(`${ctx}: maxValues must be 1-25`);
  if (s.minValues != null && s.maxValues != null && s.minValues > s.maxValues)
    errors.push(`${ctx}: minValues cannot exceed maxValues`);
  if (!Array.isArray(s.options) || s.options.length === 0) {
    errors.push(`${ctx}: at least one option is required`);
    return;
  }
  if (s.options.length > SCENARIO_LIMITS.MAX_SELECT_MENU_OPTIONS) {
    errors.push(
      `${ctx}: select menus may have at most ${SCENARIO_LIMITS.MAX_SELECT_MENU_OPTIONS} options`,
    );
  }
  const valueIds = new Set<string>();
  for (const [oi, oRaw] of s.options.entries()) {
    const o = oRaw as SelectMenuOptionCustom;
    const octx = `${ctx} option[${oi}]`;
    if (!o.label || o.label.length === 0 || o.label.length > 100)
      errors.push(`${octx}: label must be 1-100 characters`);
    if (!o.value || o.value.length === 0 || o.value.length > 100)
      errors.push(`${octx}: value must be 1-100 characters`);
    if (valueIds.has(o.value)) errors.push(`${octx}: duplicate value "${o.value}"`);
    else valueIds.add(o.value);
    if (o.description && o.description.length > 100)
      errors.push(`${octx}: description cannot exceed 100 characters`);
  }
}
