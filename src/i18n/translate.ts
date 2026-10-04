import type { Locale } from "./config";
import type { MessageKey, Messages } from "./messages/types";

export type TranslationParams = Record<string, string | number>;

/**
 * A tiny subset of ICU MessageFormat, enough for the dashboard:
 *   "Hello {name}"
 *   "{count, plural, one {# case} few {# cases} many {# cases} other {# cases}}"
 * `#` inside a plural branch is the count. Exact matches (`=0 {none}`) win over
 * plural categories. Russian and Ukrainian need `few` and `many`, so a plural
 * must never be written as `count === 1 ? ... : ...` in components.
 */
export function formatMessage(
  locale: Locale,
  template: string,
  params: TranslationParams = {},
): string {
  let out = "";
  let i = 0;

  while (i < template.length) {
    const ch = template[i];

    if (ch !== "{") {
      out += ch;
      i++;
      continue;
    }

    const end = findClosingBrace(template, i);
    if (end === -1) {
      out += template.slice(i);
      break;
    }

    out += renderPlaceholder(locale, template.slice(i + 1, end), params);
    i = end + 1;
  }

  return out;
}

function findClosingBrace(text: string, open: number): number {
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) return i;
  }
  return -1;
}

function renderPlaceholder(locale: Locale, body: string, params: TranslationParams): string {
  const firstComma = body.indexOf(",");
  const name = (firstComma === -1 ? body : body.slice(0, firstComma)).trim();
  const value = params[name];

  if (firstComma === -1) {
    return value === undefined ? `{${name}}` : String(value);
  }

  const rest = body.slice(firstComma + 1);
  const secondComma = rest.indexOf(",");
  const kind = (secondComma === -1 ? rest : rest.slice(0, secondComma)).trim();

  if (kind !== "plural" || secondComma === -1 || typeof value !== "number") {
    return value === undefined ? `{${name}}` : String(value);
  }

  const branches = parseBranches(rest.slice(secondComma + 1));
  const category = new Intl.PluralRules(locale).select(value);
  const chosen = branches[`=${value}`] ?? branches[category] ?? branches.other ?? "";
  const count = new Intl.NumberFormat(locale).format(value);

  return formatMessage(locale, chosen.replace(/#/g, count), params);
}

function parseBranches(source: string): Record<string, string> {
  const branches: Record<string, string> = {};
  let i = 0;

  while (i < source.length) {
    const open = source.indexOf("{", i);
    if (open === -1) break;

    const label = source.slice(i, open).trim();
    const close = findClosingBrace(source, open);
    if (close === -1) break;

    branches[label] = source.slice(open + 1, close);
    i = close + 1;
  }

  return branches;
}

export interface Translator {
  (key: MessageKey, params?: TranslationParams): string;
  readonly locale: Locale;
}

function lookup(messages: Messages, key: string): string | undefined {
  let current: unknown = messages;
  for (const part of key.split(".")) {
    if (current && typeof current === "object" && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof current === "string" ? current : undefined;
}

export function createTranslator(locale: Locale, messages: Messages): Translator {
  const t = ((key: MessageKey, params?: TranslationParams) => {
    const template = lookup(messages, key);
    if (template === undefined) {
      if (process.env.NODE_ENV !== "production") {
        console.warn(`[i18n] Missing translation "${key}" for locale "${locale}"`);
      }
      return key;
    }
    return formatMessage(locale, template, params);
  }) as Translator;

  Object.defineProperty(t, "locale", { value: locale, enumerable: true });
  return t;
}
