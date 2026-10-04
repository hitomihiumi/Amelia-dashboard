/**
 * Turns the stored custom components of a guild into the JSON body of a Discord "create message"
 * request, for the messages the dashboard posts itself (the Send page).
 *
 * This is a port of the bot's builders (`src/helpers/custom/Custom{Embed,Button,SelectMenu,Layout}.ts`)
 * that produces raw API JSON instead of discord.js builders, so both sides render the same stored
 * data the same way. Keep the two in step. Pure and import-light on purpose: no server-only code,
 * so it can be exercised in isolation.
 */

import {
  type ButtonCustom,
  type EmbedCustom,
  type LayoutComponent,
  type LayoutContainerChild,
  type LayoutCustom,
  type SelectMenuCustom,
} from "../db/types";
import {
  LAYOUT_LIMITS,
  isLayoutAccentColor,
  layoutAccentToInt,
} from "../db/types/Layout";
import { type VariableContext, substituteVariables } from "./substitute";

// ==================== API CONSTANTS ====================

/** Discord component types. */
const ComponentType = {
  ActionRow: 1,
  Button: 2,
  StringSelect: 3,
  Section: 9,
  TextDisplay: 10,
  Thumbnail: 11,
  MediaGallery: 12,
  Separator: 14,
  Container: 17,
} as const;

const ButtonStyle = {
  PRIMARY: 1,
  SECONDARY: 2,
  SUCCESS: 3,
  DANGER: 4,
  LINK: 5,
} as const satisfies Record<ButtonCustom["style"], number>;

/** `MessageFlags.IsComponentsV2` (1 << 15). */
export const IS_COMPONENTS_V2 = 1 << 15;

/** Discord limits for classic messages. */
export const CLASSIC_LIMITS = {
  CONTENT: 2000,
  EMBEDS: 10,
  EMBED_TOTAL: 6000,
  ROWS: 5,
  BUTTONS_PER_ROW: 5,
  SELECT_OPTIONS: 25,
} as const;

export type DiscordJson = Record<string, unknown>;

export interface MessageLibrary {
  embeds: EmbedCustom[];
  buttons: ButtonCustom[];
  selectMenus: SelectMenuCustom[];
}

/** A problem that stops a message from being sent. `code` is translated by the caller. */
export type PayloadErrorCode =
  | "noContent"
  | "contentTooLong"
  | "tooManyEmbeds"
  | "embedsTooLong"
  | "embedMissing"
  | "buttonMissing"
  | "menuMissing"
  | "buttonInvalid"
  | "menuInvalid"
  | "tooManyRows"
  | "layoutEmpty";

export interface PayloadError {
  code: PayloadErrorCode;
  params?: Record<string, string | number>;
}

export type PayloadResult =
  | { ok: true; body: DiscordJson; warnings: string[] }
  | { ok: false; error: PayloadError };

// ==================== SHARED PIECES ====================

/**
 * Emoji as Discord wants it. Mirrors discord.js `resolvePartialEmoji`: a custom emoji is
 * `<:name:id>` / `<a:name:id>` or a bare id, everything else is treated as a unicode emoji.
 */
function resolveEmoji(value: unknown): DiscordJson | undefined {
  if (!value) return undefined;

  if (typeof value === "object") {
    const emoji = value as { id?: unknown; name?: unknown; animated?: unknown };
    const out: DiscordJson = {};
    if (typeof emoji.id === "string") out.id = emoji.id;
    if (typeof emoji.name === "string") out.name = emoji.name;
    if (emoji.animated === true) out.animated = true;
    return Object.keys(out).length > 0 ? out : undefined;
  }

  if (typeof value !== "string") return undefined;
  let text = value.trim();
  if (!text) return undefined;

  if (/^\d{17,20}$/.test(text)) return { id: text };

  if (text.includes("%")) {
    try {
      text = decodeURIComponent(text);
    } catch {
      // keep the raw text
    }
  }

  if (!text.includes(":")) return { name: text, animated: false };

  const match = text.match(/^<?(?:(a):)?(\w{2,32}):(\d{17,20})?>?$/);
  if (!match) return { name: text, animated: false };
  const out: DiscordJson = { name: match[2], animated: Boolean(match[1]) };
  if (match[3]) out.id = match[3];
  return out;
}

function isButtonUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return ["http:", "https:", "discord:"].includes(url.protocol);
  } catch {
    return false;
  }
}

/** A real http(s) link, checked after placeholders were filled in. */
function isHttpUrl(value: string): boolean {
  if (!value || value.length > LAYOUT_LIMITS.MAX_URL_LENGTH) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** A stored button as API JSON; throws when Discord would reject it. */
export function buttonToJson(data: ButtonCustom): DiscordJson {
  const style = ButtonStyle[data.style];
  if (!style) throw new Error(`unknown style "${String(data.style)}"`);

  const label = typeof data.label === "string" ? data.label : "";
  const emoji = resolveEmoji(data.emoji);
  if (!label && !emoji) throw new Error("needs a label or an emoji");
  if (label.length > 80) throw new Error("label is longer than 80 characters");

  const json: DiscordJson = { type: ComponentType.Button, style };
  if (label) json.label = label;
  if (emoji) json.emoji = emoji;

  if (data.style === "LINK") {
    if (!data.url || !isButtonUrl(data.url) || data.url.length > 512) {
      throw new Error("link buttons need a valid URL");
    }
    json.url = data.url;
  } else {
    if (!data.id || data.id.length > 100) throw new Error("invalid custom id");
    json.custom_id = data.id;
  }

  if (data.disabled) json.disabled = true;
  return json;
}

/** A stored select menu as API JSON; throws when Discord would reject it. */
export function selectMenuToJson(data: SelectMenuCustom): DiscordJson {
  const options = Array.isArray(data.options) ? data.options : [];
  if (options.length < 1 || options.length > CLASSIC_LIMITS.SELECT_OPTIONS) {
    throw new Error(`${options.length} options`);
  }
  if (!data.id || data.id.length > 100) throw new Error("invalid custom id");
  if (data.placeholder && data.placeholder.length > 150) throw new Error("placeholder too long");

  const values = new Set<string>();
  const optionJson = options.map((option, index) => {
    const label = typeof option.label === "string" ? option.label : "";
    const value = typeof option.value === "string" ? option.value : "";
    if (!label || label.length > 100) throw new Error(`option ${index + 1}: invalid label`);
    if (!value || value.length > 100) throw new Error(`option ${index + 1}: invalid value`);
    if (values.has(value)) throw new Error(`option ${index + 1}: duplicate value`);
    values.add(value);
    if (option.description && option.description.length > 100) {
      throw new Error(`option ${index + 1}: description too long`);
    }

    const json: DiscordJson = { label, value };
    if (option.description) json.description = option.description;
    const emoji = resolveEmoji(option.emoji);
    if (emoji) json.emoji = emoji;
    if (option.default) json.default = true;
    return json;
  });

  const json: DiscordJson = {
    type: ComponentType.StringSelect,
    custom_id: data.id,
    options: optionJson,
  };
  if (data.placeholder) json.placeholder = data.placeholder;
  if (data.minValues !== undefined) json.min_values = data.minValues;
  if (data.maxValues !== undefined) json.max_values = data.maxValues;
  if (
    data.minValues !== undefined &&
    data.maxValues !== undefined &&
    data.minValues > data.maxValues
  ) {
    throw new Error("min values is greater than max values");
  }
  if (data.disabled) json.disabled = true;
  return json;
}

// ==================== CLASSIC MESSAGES ====================

function embedToJson(data: EmbedCustom, context?: VariableContext): DiscordJson | null {
  const sub = (value: string) => substituteVariables(value, context);
  const embed: DiscordJson = {};

  if (data.title) embed.title = sub(data.title);
  if (data.description) embed.description = sub(data.description);

  if (typeof data.color === "number") embed.color = data.color;
  else if (typeof data.color === "string" && /^#[0-9a-fA-F]{6}$/.test(data.color.trim())) {
    embed.color = Number.parseInt(data.color.trim().slice(1), 16);
  }

  if (data.author?.name) {
    embed.author = {
      name: sub(data.author.name),
      ...(data.author.icon_url ? { icon_url: sub(data.author.icon_url) } : {}),
      ...(data.author.url ? { url: sub(data.author.url) } : {}),
    };
  }
  if (data.thumbnail) embed.thumbnail = { url: sub(data.thumbnail) };
  if (data.image) embed.image = { url: sub(data.image) };
  if (data.footer?.text) {
    embed.footer = {
      text: sub(data.footer.text),
      ...(data.footer.icon_url ? { icon_url: sub(data.footer.icon_url) } : {}),
    };
  }
  if (Array.isArray(data.fields) && data.fields.length > 0) {
    embed.fields = data.fields.slice(0, 25).map((field) => ({
      name: sub(field.name),
      value: sub(field.value),
      ...(field.inline ? { inline: true } : {}),
    }));
  }
  if (data.timestamp) embed.timestamp = new Date().toISOString();

  // An embed without any visible part would be rejected by Discord.
  const visible = ["title", "description", "author", "thumbnail", "image", "footer", "fields"];
  return visible.some((key) => embed[key] !== undefined) ? embed : null;
}

/** Characters Discord counts against the 6000 limit of all embeds of a message. */
function embedLength(embed: DiscordJson): number {
  const author = embed.author as { name?: string } | undefined;
  const footer = embed.footer as { text?: string } | undefined;
  const fields = (embed.fields as Array<{ name: string; value: string }> | undefined) ?? [];
  return (
    ((embed.title as string | undefined)?.length ?? 0) +
    ((embed.description as string | undefined)?.length ?? 0) +
    (author?.name?.length ?? 0) +
    (footer?.text?.length ?? 0) +
    fields.reduce((sum, field) => sum + field.name.length + field.value.length, 0)
  );
}

export interface ClassicInput {
  content: string;
  embedIds: string[];
  buttonIds: string[];
  selectMenuIds: string[];
}

/**
 * Content, embeds, buttons and select menus, laid out like the bot's `/send` command: buttons
 * fill rows of five first, every select menu takes a row of its own, at most five rows.
 * Where `/send` quietly drops what does not fit, this refuses so nothing is lost unnoticed.
 */
export function buildClassicBody(
  input: ClassicInput,
  library: MessageLibrary,
  context?: VariableContext,
): PayloadResult {
  const content = substituteVariables(input.content ?? "", context).trim();
  if (content.length > CLASSIC_LIMITS.CONTENT) {
    return { ok: false, error: { code: "contentTooLong", params: { max: CLASSIC_LIMITS.CONTENT } } };
  }

  const warnings: string[] = [];
  const embeds: DiscordJson[] = [];

  if (input.embedIds.length > CLASSIC_LIMITS.EMBEDS) {
    return { ok: false, error: { code: "tooManyEmbeds", params: { max: CLASSIC_LIMITS.EMBEDS } } };
  }
  for (const id of input.embedIds) {
    const stored = library.embeds.find((embed) => embed.id === id);
    if (!stored) return { ok: false, error: { code: "embedMissing" } };
    const json = embedToJson(stored, context);
    if (json) embeds.push(json);
    else warnings.push(`Embed "${stored.name || id}" has nothing to show and was skipped`);
  }
  const embedChars = embeds.reduce((sum, embed) => sum + embedLength(embed), 0);
  if (embedChars > CLASSIC_LIMITS.EMBED_TOTAL) {
    return {
      ok: false,
      error: { code: "embedsTooLong", params: { max: CLASSIC_LIMITS.EMBED_TOTAL } },
    };
  }

  const buttons: DiscordJson[] = [];
  for (const id of input.buttonIds) {
    const stored = library.buttons.find((button) => button.id === id);
    if (!stored) return { ok: false, error: { code: "buttonMissing" } };
    try {
      buttons.push(buttonToJson(stored));
    } catch (error) {
      return {
        ok: false,
        error: {
          code: "buttonInvalid",
          params: { name: stored.name || stored.label || id, reason: (error as Error).message },
        },
      };
    }
  }

  const menus: DiscordJson[] = [];
  for (const id of input.selectMenuIds) {
    const stored = library.selectMenus.find((menu) => menu.id === id);
    if (!stored) return { ok: false, error: { code: "menuMissing" } };
    try {
      menus.push(selectMenuToJson(stored));
    } catch (error) {
      return {
        ok: false,
        error: {
          code: "menuInvalid",
          params: { name: stored.name || stored.placeholder || id, reason: (error as Error).message },
        },
      };
    }
  }

  const rows: DiscordJson[] = [];
  for (let i = 0; i < buttons.length; i += CLASSIC_LIMITS.BUTTONS_PER_ROW) {
    rows.push({
      type: ComponentType.ActionRow,
      components: buttons.slice(i, i + CLASSIC_LIMITS.BUTTONS_PER_ROW),
    });
  }
  for (const menu of menus) rows.push({ type: ComponentType.ActionRow, components: [menu] });

  if (rows.length > CLASSIC_LIMITS.ROWS) {
    return { ok: false, error: { code: "tooManyRows", params: { max: CLASSIC_LIMITS.ROWS } } };
  }

  if (!content && embeds.length === 0) {
    return { ok: false, error: { code: "noContent" } };
  }

  const body: DiscordJson = {};
  if (content) body.content = content;
  if (embeds.length > 0) body.embeds = embeds;
  if (rows.length > 0) body.components = rows;

  return { ok: true, body, warnings };
}

// ==================== COMPONENTS V2 LAYOUTS ====================
// Port of the bot's `buildLayoutPayload`. The stored layout is resolved (placeholders filled in,
// everything re-validated, whatever cannot be rendered dropped or degraded), cut to Discord's
// limits and only then turned into JSON. Whatever is dropped is reported through `warnings`.

interface RText {
  kind: "text";
  content: string;
}

interface RSeparator {
  kind: "separator";
  divider: boolean;
  spacing: 1 | 2;
}

interface RGalleryItem {
  url: string;
  description?: string;
  spoiler: boolean;
}

interface RGallery {
  kind: "gallery";
  items: RGalleryItem[];
}

interface RButton {
  id: string;
  json: DiscordJson;
}

interface RSelect {
  id: string;
  json: DiscordJson;
}

interface RSection {
  kind: "section";
  texts: string[];
  accessory:
    | { kind: "thumbnail"; url: string; description?: string; spoiler: boolean }
    | { kind: "button"; button: RButton };
}

interface RActions {
  kind: "actions";
  buttons: RButton[];
  select?: RSelect;
}

type RChild = RText | RSeparator | RGallery | RSection | RActions;

interface RContainer {
  kind: "container";
  accentColor?: number;
  spoiler: boolean;
  children: RChild[];
}

type RTop = RChild | RContainer;

function cutDescription(value: string): string | undefined {
  const text = value.trim();
  if (text === "") return undefined;
  return text.length > LAYOUT_LIMITS.MAX_MEDIA_DESCRIPTION
    ? text.slice(0, LAYOUT_LIMITS.MAX_MEDIA_DESCRIPTION)
    : text;
}

function countNode(node: RTop): number {
  switch (node.kind) {
    case "section":
      return 1 + node.texts.length + 1;
    case "actions":
      return 1 + node.buttons.length + (node.select ? 1 : 0);
    case "container":
      return 1 + node.children.reduce((sum, child) => sum + countNode(child), 0);
    default:
      return 1;
  }
}

export interface LayoutBodyResult {
  body: DiscordJson | null;
  warnings: string[];
}

/**
 * Turns a stored layout into the body of a Components V2 message. Returns `body: null` when
 * nothing renderable is left. The body never carries `content` or `embeds`: Discord rejects
 * them next to the `IsComponentsV2` flag.
 */
export function buildLayoutBody(
  layout: LayoutCustom,
  library: Pick<MessageLibrary, "buttons" | "selectMenus">,
  context?: VariableContext,
): LayoutBodyResult {
  const warnings: string[] = [];
  const warn = (message: string) => warnings.push(`Layout "${layout?.name || layout?.id}": ${message}`);

  const buttons = new Map<string, ButtonCustom>();
  for (const button of library?.buttons ?? []) buttons.set(button.id, button);
  const selectMenus = new Map<string, SelectMenuCustom>();
  for (const menu of library?.selectMenus ?? []) selectMenus.set(menu.id, menu);

  const sub = (value: unknown): string =>
    typeof value === "string" ? substituteVariables(value, context) : "";

  // ---------- resolve ----------

  const resolveText = (value: unknown): string | null => {
    const text = sub(value);
    return text.trim() === "" ? null : text;
  };

  const resolveButton = (id: unknown): RButton | null => {
    const data = typeof id === "string" ? buttons.get(id) : undefined;
    if (!data) {
      warn(`button "${String(id)}" does not exist anymore, skipped`);
      return null;
    }
    try {
      return { id: data.id, json: buttonToJson(data) };
    } catch (error) {
      warn(`button "${data.id}" is invalid, skipped (${(error as Error).message})`);
      return null;
    }
  };

  const resolveSelect = (id: unknown): RSelect | null => {
    const data = typeof id === "string" ? selectMenus.get(id) : undefined;
    if (!data) {
      warn(`select menu "${String(id)}" does not exist anymore, skipped`);
      return null;
    }
    try {
      return { id: data.id, json: selectMenuToJson(data) };
    } catch (error) {
      warn(`select menu "${data.id}" is invalid, skipped (${(error as Error).message})`);
      return null;
    }
  };

  const resolveChild = (child: LayoutContainerChild | undefined): RChild[] => {
    if (!child || typeof child !== "object") return [];

    switch (child.type) {
      case "text": {
        const content = resolveText(child.content);
        return content === null ? [] : [{ kind: "text", content }];
      }

      case "separator":
        return [
          {
            kind: "separator",
            divider: child.divider !== false,
            spacing: child.spacing === "large" ? 2 : 1,
          },
        ];

      case "gallery": {
        const items: RGalleryItem[] = [];
        for (const item of Array.isArray(child.items) ? child.items : []) {
          const url = sub(item?.url).trim();
          if (!isHttpUrl(url)) {
            warn(`gallery item dropped, "${url}" is not a valid http(s) URL after substitution`);
            continue;
          }
          if (items.length >= LAYOUT_LIMITS.MAX_GALLERY_ITEMS) break;
          items.push({
            url,
            description: cutDescription(sub(item.description)),
            spoiler: item.spoiler === true,
          });
        }
        return items.length > 0 ? [{ kind: "gallery", items }] : [];
      }

      case "section": {
        const texts: string[] = [];
        for (const raw of Array.isArray(child.texts) ? child.texts : []) {
          const text = resolveText(raw);
          if (text !== null && texts.length < LAYOUT_LIMITS.MAX_SECTION_TEXTS) texts.push(text);
        }
        if (texts.length === 0) return [];

        const asPlainText = (): RChild[] => texts.map((content) => ({ kind: "text", content }));
        const accessory = child.accessory;

        if (accessory?.kind === "thumbnail") {
          const url = sub(accessory.url).trim();
          if (!isHttpUrl(url)) {
            warn(
              `section thumbnail "${url}" is not a valid http(s) URL after substitution, rendered as plain text`,
            );
            return asPlainText();
          }
          return [
            {
              kind: "section",
              texts,
              accessory: {
                kind: "thumbnail",
                url,
                description: cutDescription(sub(accessory.description)),
                spoiler: accessory.spoiler === true,
              },
            },
          ];
        }

        if (accessory?.kind === "button") {
          const button = resolveButton(accessory.buttonId);
          if (!button) return asPlainText();
          return [{ kind: "section", texts, accessory: { kind: "button", button } }];
        }

        warn("section without a usable accessory, rendered as plain text");
        return asPlainText();
      }

      case "actions": {
        const rowButtons: RButton[] = [];
        for (const id of Array.isArray(child.buttons) ? child.buttons : []) {
          if (rowButtons.length >= LAYOUT_LIMITS.MAX_BUTTONS_PER_ROW) {
            warn("row has more than 5 buttons, the rest was dropped");
            break;
          }
          const button = resolveButton(id);
          if (button) rowButtons.push(button);
        }

        const select = child.selectMenuId ? resolveSelect(child.selectMenuId) : null;
        const rows: RChild[] = [];
        // A select menu must be alone in its row: a mixed row becomes two rows.
        if (rowButtons.length > 0) rows.push({ kind: "actions", buttons: rowButtons });
        if (select) rows.push({ kind: "actions", buttons: [], select });
        return rows;
      }

      default:
        warn(`unknown component type "${(child as { type?: string }).type}", skipped`);
        return [];
    }
  };

  const resolveTop = (component: LayoutComponent | undefined): RTop[] => {
    if (!component || typeof component !== "object") return [];

    if (component.type !== "container") return resolveChild(component);

    const children: RChild[] = [];
    for (const child of Array.isArray(component.children) ? component.children : []) {
      if ((child as { type?: string })?.type === "container") {
        warn("nested container skipped");
        continue;
      }
      children.push(...resolveChild(child));
    }
    if (children.length === 0) return [];

    return [
      {
        kind: "container",
        accentColor: isLayoutAccentColor(component.accentColor)
          ? layoutAccentToInt(component.accentColor)
          : undefined,
        spoiler: component.spoiler === true,
        children,
      },
    ];
  };

  const resolved: RTop[] = [];
  for (const component of Array.isArray(layout?.components) ? layout.components : []) {
    resolved.push(...resolveTop(component));
  }

  // ---------- fit: keep the longest prefix within the component cap ----------

  const fitted: RTop[] = [];
  let usedComponents = 0;
  let full = false;

  for (const node of resolved) {
    if (full) break;

    if (node.kind === "container") {
      const children: RChild[] = [];
      let inner = usedComponents + 1;
      for (const child of node.children) {
        const size = countNode(child);
        if (inner + size > LAYOUT_LIMITS.MAX_COMPONENTS) {
          full = true;
          break;
        }
        inner += size;
        children.push(child);
      }
      if (children.length > 0) {
        fitted.push({ ...node, children });
        usedComponents = inner;
      }
    } else {
      const size = countNode(node);
      if (usedComponents + size > LAYOUT_LIMITS.MAX_COMPONENTS) {
        full = true;
        break;
      }
      usedComponents += size;
      fitted.push(node);
    }
  }

  if (full)
    warn(`more than ${LAYOUT_LIMITS.MAX_COMPONENTS} components, the last ones were dropped`);

  // ---------- finalize: text budget, unique custom ids, no empty leftovers ----------

  const usedIds = new Set<string>();
  let usedText = 0;
  let textCut = false;

  const takeText = (text: string): string => {
    const remaining = LAYOUT_LIMITS.MAX_TEXT_LENGTH - usedText;
    if (remaining <= 0) {
      textCut = true;
      return "";
    }

    let out = text;
    if (text.length > remaining) {
      textCut = true;
      out = text.slice(0, remaining);
      // Do not leave half of a surrogate pair (emoji) behind.
      const last = out.charCodeAt(out.length - 1);
      if (last >= 0xd800 && last <= 0xdbff) out = out.slice(0, -1);
    }
    usedText += out.length;
    return out.trim() === "" ? "" : out;
  };

  const claim = (id: string): boolean => {
    if (usedIds.has(id)) {
      warn(`"${id}" is used twice in the message, the second one was skipped`);
      return false;
    }
    usedIds.add(id);
    return true;
  };

  const finalizeChild = (child: RChild): RChild[] => {
    switch (child.kind) {
      case "text": {
        const content = takeText(child.content);
        return content ? [{ kind: "text", content }] : [];
      }

      case "section": {
        const texts = child.texts.map(takeText).filter((text) => text !== "");
        if (texts.length === 0) return [];
        const accessory = child.accessory;
        if (accessory.kind === "button" && !claim(accessory.button.id)) {
          return texts.map((content) => ({ kind: "text", content }));
        }
        return [{ ...child, texts }];
      }

      case "actions": {
        const rowButtons = child.buttons.filter((button) => claim(button.id));
        const select = child.select && claim(child.select.id) ? child.select : undefined;
        if (rowButtons.length === 0 && !select) return [];
        return [{ kind: "actions", buttons: rowButtons, select }];
      }

      default:
        return [child];
    }
  };

  const finalized: RTop[] = [];
  for (const node of fitted) {
    if (node.kind === "container") {
      const children = node.children.flatMap(finalizeChild);
      if (children.length > 0) finalized.push({ ...node, children });
    } else {
      finalized.push(...finalizeChild(node));
    }
  }

  if (textCut)
    warn(
      `text is longer than ${LAYOUT_LIMITS.MAX_TEXT_LENGTH} characters, the last blocks were cut`,
    );

  // ---------- build ----------

  const buildChild = (child: RChild): DiscordJson => {
    switch (child.kind) {
      case "text":
        return { type: ComponentType.TextDisplay, content: child.content };

      case "separator":
        return { type: ComponentType.Separator, divider: child.divider, spacing: child.spacing };

      case "gallery":
        return {
          type: ComponentType.MediaGallery,
          items: child.items.map((item) => ({
            media: { url: item.url },
            spoiler: item.spoiler,
            ...(item.description ? { description: item.description } : {}),
          })),
        };

      case "section": {
        const accessory: DiscordJson =
          child.accessory.kind === "button"
            ? child.accessory.button.json
            : {
                type: ComponentType.Thumbnail,
                media: { url: child.accessory.url },
                spoiler: child.accessory.spoiler,
                ...(child.accessory.description ? { description: child.accessory.description } : {}),
              };
        return {
          type: ComponentType.Section,
          components: child.texts.map((content) => ({
            type: ComponentType.TextDisplay,
            content,
          })),
          accessory,
        };
      }

      case "actions":
        return {
          type: ComponentType.ActionRow,
          components: child.select ? [child.select.json] : child.buttons.map((button) => button.json),
        };
    }
  };

  const buildTop = (node: RTop): DiscordJson => {
    if (node.kind !== "container") return buildChild(node);
    return {
      type: ComponentType.Container,
      spoiler: node.spoiler,
      ...(node.accentColor !== undefined ? { accent_color: node.accentColor } : {}),
      components: node.children.map(buildChild),
    };
  };

  const components = finalized.map(buildTop);
  if (components.length === 0) return { body: null, warnings };

  return { body: { components, flags: IS_COMPONENTS_V2 }, warnings };
}
