"use server";

import { requireGuildAdmin } from "@/app/dashboard/[guildId]/actions";
import { getT } from "@/i18n/server";
import type { builder as enBuilder } from "@/i18n/messages/en/builder";
import type { Translator } from "@/i18n/translate";
import { authOptions } from "@/lib/auth";
import { Guild } from "@/lib/db/Guild";
import {
  type ButtonCustom,
  type EmbedCustom,
  type IModalField,
  type LayoutCustom,
  type ModalCustom,
  SCENARIO_LIMITS,
  type SelectMenuCustom,
  type SelectMenuOptionCustom,
} from "@/lib/db/types";
import type { GuildActionState } from "@/types/dashboard";
import { getServerSession } from "next-auth";
import { validateLayouts } from "./layouts/validate";
import { revalidatePath } from "next/cache";

const BUTTON_STYLES = new Set(["PRIMARY", "SECONDARY", "SUCCESS", "DANGER", "LINK"]);
const LINK_URL_RE = /^https?:\/\//i;
const DISCORD_ID_MAX = 100;

function fail(error: string): GuildActionState {
  return { ok: false, error };
}

type ErrorKey = keyof (typeof enBuilder)["errors"]["components"];

/** Returns a function that translates a validation error and appends it to `errors`. */
function makeReporter(errors: string[], t: Translator) {
  return (key: ErrorKey, ctx: string, params: Record<string, string | number> = {}) => {
    errors.push(t(`builder.errors.components.${key}`, { ctx, ...params }));
  };
}

export async function updateComponents(
  guildId: string,
  formData: FormData,
): Promise<GuildActionState> {
  const t = await getT();
  const session = await getServerSession(authOptions);
  if (!session) return fail(t("builder.errors.notAuthorized"));

  const gate = await requireGuildAdmin(guildId);
  if (gate.error) return fail(gate.error);

  const raw = formData.get("components");
  if (!raw) return fail(t("builder.errors.missingData"));

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw as string);
  } catch {
    return fail(t("builder.errors.invalidFormat"));
  }
  if (!parsed || typeof parsed !== "object") return fail(t("builder.errors.invalidPayload"));

  const data = parsed as {
    modals?: ModalCustom[];
    embed?: EmbedCustom[];
    buttons?: ButtonCustom[];
    selectMenus?: SelectMenuCustom[];
    layouts?: unknown[];
  };

  const errors: string[] = [];

  const modals = Array.isArray(data.modals) ? data.modals : [];
  const embeds = Array.isArray(data.embed) ? data.embed : [];
  const buttons = Array.isArray(data.buttons) ? data.buttons : [];
  const selectMenus = Array.isArray(data.selectMenus) ? data.selectMenus : [];
  const layouts = Array.isArray(data.layouts) ? data.layouts : [];

  checkUniqueIds("modal", modals, errors, t);
  checkUniqueIds("embed", embeds, errors, t);
  checkUniqueIds("button", buttons, errors, t);
  checkUniqueIds("selectMenu", selectMenus, errors, t);

  modals.forEach((m, i) => validateModal(m, i, errors, t));
  embeds.forEach((e, i) => validateEmbed(e, i, errors, t));
  buttons.forEach((b, i) => validateButton(b, i, errors, t));
  selectMenus.forEach((s, i) => validateSelectMenu(s, i, errors, t));
  // Layouts point at the buttons and select menus of this very payload, so one save can create both.
  errors.push(...validateLayouts(layouts, { buttons, selectMenus }, t));

  if (errors.length > 0) {
    return fail(`${t("builder.errors.validationFailed")}\n${errors.join("\n")}`);
  }

  const guild = new Guild(guildId);
  // Only touch the custom-component collections; preserve scenarios untouched.
  await guild.set("utils.components.modals", modals);
  await guild.set("utils.components.embed", embeds);
  await guild.set("utils.components.buttons", buttons);
  await guild.set("utils.components.selectMenus", selectMenus);
  await guild.set("utils.components.layouts", layouts as LayoutCustom[]);
  revalidatePath(`/dashboard/${guildId}/components`);
  return { ok: true };
}

function checkUniqueIds(
  label: "modal" | "embed" | "button" | "selectMenu",
  items: { id?: string }[],
  errors: string[],
  t: Translator,
) {
  const kind = t(`builder.errors.kinds.${label}`);
  const seen = new Set<string>();
  for (const item of items) {
    if (!item.id || typeof item.id !== "string") {
      errors.push(t("builder.errors.components.itemMissingId", { kind }));
      continue;
    }
    if (seen.has(item.id)) errors.push(t("builder.errors.components.duplicateId", { kind, id: item.id }));
    seen.add(item.id);
  }
}

function validateModal(m: ModalCustom, i: number, errors: string[], t: Translator) {
  const ctx = `modal[${i}] "${m.id}"`;
  const fail = makeReporter(errors, t);
  if (!m.title || m.title.length === 0 || m.title.length > 45) {
    fail("modalTitleLength", ctx);
  }
  if (!Array.isArray(m.fields)) {
    fail("modalFieldsNotArray", ctx);
    return;
  }
  if (m.fields.length > 5) fail("modalTooManyFields", ctx, { max: 5 });
  const fieldIds = new Set<string>();
  for (const [fi, fRaw] of m.fields.entries()) {
    const f = fRaw as IModalField;
    const fctx = `${ctx} field[${fi}]`;
    if (!f.id || typeof f.id !== "string") fail("fieldMissingId", fctx);
    else if (fieldIds.has(f.id)) fail("fieldDuplicateId", fctx);
    else fieldIds.add(f.id);
    if (!f.name || f.name.length === 0 || f.name.length > 45) fail("fieldLabelLength", fctx);
    if (f.type !== "short" && f.type !== "long") fail("fieldInvalidType", fctx);
    if (f.placeholder && f.placeholder.length > 100) fail("fieldPlaceholderLong", fctx);
    if (typeof f.min === "number") {
      if (f.min < 0 || f.min > DISCORD_ID_MAX) fail("fieldMinRange", fctx, { max: DISCORD_ID_MAX });
      if (f.min < 0) fail("fieldMinNegative", fctx);
    }
    if (typeof f.max === "number") {
      if (f.max < 0 || f.max > 4000) fail("fieldMaxRange", fctx);
    }
    if (typeof f.min === "number" && typeof f.max === "number" && f.max > 0 && f.min > f.max) {
      fail("fieldMinExceedsMax", fctx);
    }
    if (typeof f.required !== "boolean") fail("fieldRequiredBool", fctx);
  }
}

function validateEmbed(e: EmbedCustom, i: number, errors: string[], t: Translator) {
  const ctx = `embed[${i}] "${e.name || e.id}"`;
  const fail = makeReporter(errors, t);
  if (e.title && e.title.length > 256) fail("embedTitleLong", ctx);
  if (e.description && e.description.length > 4096) fail("embedDescriptionLong", ctx);
  if (e.color != null) {
    const c = e.color as unknown;
    const valid =
      typeof c === "number" ||
      (typeof c === "string" &&
        (/^#?[0-9a-fA-F]{3,6}$/.test(c.replace(/^#/, "")) ||
          NAMED_DISCORD_COLORS[c.toUpperCase()] != null));
    if (!valid) fail("embedInvalidColor", ctx, { color: String(c) });
  }
  if (e.author) {
    if (e.author.name && e.author.name.length > 256) fail("authorNameLong", ctx);
    if (e.author.icon_url && !LINK_URL_RE.test(e.author.icon_url)) fail("authorIconUrl", ctx);
    if (e.author.url && !LINK_URL_RE.test(e.author.url)) fail("authorUrl", ctx);
  }
  if (e.image && !LINK_URL_RE.test(e.image)) fail("imageUrl", ctx);
  if (e.thumbnail && !LINK_URL_RE.test(e.thumbnail)) fail("thumbnailUrl", ctx);
  if (e.footer) {
    if (e.footer.text && e.footer.text.length > 2048) fail("footerTextLong", ctx);
    if (e.footer.icon_url && !LINK_URL_RE.test(e.footer.icon_url)) fail("footerIconUrl", ctx);
  }
  if (e.fields && Array.isArray(e.fields)) {
    if (e.fields.length > SCENARIO_LIMITS.MAX_EMBED_FIELDS)
      fail("embedTooManyFields", ctx, { max: SCENARIO_LIMITS.MAX_EMBED_FIELDS });
    for (const [fi, f] of e.fields.entries()) {
      const fctx = `${ctx} field[${fi}]`;
      if (!f.name || f.name.length === 0 || f.name.length > 256)
        fail("embedFieldNameLength", fctx);
      if (!f.value || f.value.length === 0 || f.value.length > 1024)
        fail("embedFieldValueLength", fctx);
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

function validateButton(b: ButtonCustom, i: number, errors: string[], t: Translator) {
  const ctx = `button[${i}] "${b.name || b.id}"`;
  const fail = makeReporter(errors, t);
  if (!b.label || b.label.length === 0 || b.label.length > 80) fail("buttonLabelLength", ctx);
  if (!BUTTON_STYLES.has(b.style)) fail("buttonInvalidStyle", ctx, { style: String(b.style) });
  if (b.style === "LINK" && !b.url) fail("buttonLinkNeedsUrl", ctx);
  if (b.style === "LINK" && b.url && !LINK_URL_RE.test(b.url)) fail("buttonInvalidUrl", ctx);
  if (b.style !== "LINK" && b.url) fail("buttonUrlOnlyLink", ctx);
}

function validateSelectMenu(s: SelectMenuCustom, i: number, errors: string[], t: Translator) {
  const ctx = `selectMenu[${i}] "${s.name || s.id}"`;
  const fail = makeReporter(errors, t);
  if (s.placeholder && s.placeholder.length > 150) fail("selectPlaceholderLong", ctx);
  if (s.minValues != null && (s.minValues < 0 || s.minValues > 25)) fail("selectMinRange", ctx);
  if (s.maxValues != null && (s.maxValues < 1 || s.maxValues > 25)) fail("selectMaxRange", ctx);
  if (s.minValues != null && s.maxValues != null && s.minValues > s.maxValues)
    fail("selectMinExceedsMax", ctx);
  if (!Array.isArray(s.options) || s.options.length === 0) {
    fail("selectNeedsOption", ctx);
    return;
  }
  if (s.options.length > SCENARIO_LIMITS.MAX_SELECT_MENU_OPTIONS) {
    fail("selectTooManyOptions", ctx, { max: SCENARIO_LIMITS.MAX_SELECT_MENU_OPTIONS });
  }
  const valueIds = new Set<string>();
  for (const [oi, oRaw] of s.options.entries()) {
    const o = oRaw as SelectMenuOptionCustom;
    const octx = `${ctx} option[${oi}]`;
    if (!o.label || o.label.length === 0 || o.label.length > 100) fail("optionLabelLength", octx);
    if (!o.value || o.value.length === 0 || o.value.length > 100) fail("optionValueLength", octx);
    if (valueIds.has(o.value)) fail("optionDuplicateValue", octx, { value: o.value });
    else valueIds.add(o.value);
    if (o.description && o.description.length > 100) fail("optionDescriptionLong", octx);
  }
}
