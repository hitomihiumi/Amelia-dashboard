import type {
  ModerationForm,
  ModerationFormField,
  ModerationFormFieldType,
  ModerationSubmissionAnswer,
} from "@/lib/db/types";
import { DEFAULT_APPEAL_FORM, DEFAULT_REPORT_FORM } from "@/lib/db/types";
import type { Translator } from "@/i18n/translate";

export const MAX_FIELDS_PER_FORM = 15;
export const MAX_TEXT_LENGTH = 1024;
export const MAX_PARAGRAPH_LENGTH = 2000;

const SNOWFLAKE = /^\d{17,20}$/;

/** Merge a stored form with the defaults so partial rows stay usable. */
export function normalizeForm(
  raw: unknown,
  kind: "report" | "appeal",
): ModerationForm {
  const defaults =
    kind === "report" ? DEFAULT_REPORT_FORM : DEFAULT_APPEAL_FORM;
  if (!raw || typeof raw !== "object") return { ...defaults };

  const form = raw as Partial<ModerationForm>;

  return {
    ...defaults,
    ...form,
    fields: Array.isArray(form.fields) ? form.fields : [],
  };
}

/** Longest value accepted for a field type. */
function maxLengthFor(type: ModerationFormFieldType): number {
  return type === "paragraph" ? MAX_PARAGRAPH_LENGTH : MAX_TEXT_LENGTH;
}

export type ValidationResult =
  | { ok: true; answers: ModerationSubmissionAnswer[] }
  | { ok: false; error: string };

/**
 * Validate raw form input against the configured fields.
 *
 * Everything the browser sends is untrusted: unknown field ids are dropped,
 * required fields must be filled, and every value is length/range checked.
 */
export function validateAnswers(
  form: ModerationForm,
  raw: Record<string, unknown>,
  t: Translator,
): ValidationResult {
  const answers: ModerationSubmissionAnswer[] = [];

  for (const field of form.fields.slice(0, MAX_FIELDS_PER_FORM)) {
    const provided = raw[field.id];
    const result = validateField(field, provided, t);

    if (!result.ok) return result;

    answers.push({
      fieldId: field.id,
      label: field.label,
      type: field.type,
      value: result.value,
    });
  }

  return { ok: true, answers };
}

type FieldResult =
  | { ok: true; value: string | number | boolean | null }
  | { ok: false; error: string };

function validateField(
  field: ModerationFormField,
  provided: unknown,
  t: Translator,
): FieldResult {
  const label = field.label;
  const missing =
    provided === undefined ||
    provided === null ||
    (typeof provided === "string" && provided.trim() === "");

  if (missing) {
    if (field.required && field.type !== "boolean") {
      return { ok: false, error: t("site.submit.validation.required", { label }) };
    }
    return { ok: true, value: field.type === "boolean" ? false : null };
  }

  switch (field.type) {
    case "number": {
      const value = Number(provided);
      if (!Number.isFinite(value)) {
        return { ok: false, error: t("site.submit.validation.number", { label }) };
      }
      if (field.min !== null && value < field.min) {
        return {
          ok: false,
          error: t("site.submit.validation.min", { label, min: field.min }),
        };
      }
      if (field.max !== null && value > field.max) {
        return {
          ok: false,
          error: t("site.submit.validation.max", { label, max: field.max }),
        };
      }
      return { ok: true, value };
    }

    case "boolean":
      return { ok: true, value: provided === true || provided === "true" };

    case "select": {
      const value = String(provided);
      const allowed = field.options.some((option) => option.value === value);
      if (!allowed) {
        return {
          ok: false,
          error: t("site.submit.validation.option", { label }),
        };
      }
      return { ok: true, value };
    }

    case "user":
    case "channel": {
      const value = String(provided).trim();
      if (!SNOWFLAKE.test(value)) {
        return {
          ok: false,
          error: t("site.submit.validation.discordId", { label }),
        };
      }
      return { ok: true, value };
    }

    case "url":
    case "message_link": {
      const value = String(provided).trim();
      if (!/^https?:\/\/\S+$/i.test(value) || value.length > MAX_TEXT_LENGTH) {
        return {
          ok: false,
          error: t("site.submit.validation.link", { label }),
        };
      }
      return { ok: true, value };
    }

    default: {
      const value = String(provided).trim();
      const limit = maxLengthFor(field.type);

      if (field.min !== null && value.length < field.min) {
        return {
          ok: false,
          error: t("site.submit.validation.minLength", { label, min: field.min }),
        };
      }
      if (value.length > Math.min(field.max ?? limit, limit)) {
        return {
          ok: false,
          error: t("site.submit.validation.maxLength", {
            label,
            max: Math.min(field.max ?? limit, limit),
          }),
        };
      }

      return { ok: true, value };
    }
  }
}

/**
 * Validate the field list coming from the form builder before storing it.
 * Returns a message in the language of the translator, or `null` when valid.
 */
export function validateFormConfiguration(
  form: ModerationForm,
  t: Translator,
): string | null {
  if (
    typeof form.cooldown !== "number" ||
    form.cooldown < 0 ||
    form.cooldown > 2_592_000
  ) {
    return t("moderation.errors.formCooldown");
  }
  if (
    typeof form.max_pending !== "number" ||
    form.max_pending < 1 ||
    form.max_pending > 20
  ) {
    return t("moderation.errors.formMaxPending");
  }
  if (form.channel !== null && !SNOWFLAKE.test(String(form.channel))) {
    return t("moderation.errors.formChannel");
  }
  if (!Array.isArray(form.fields) || form.fields.length > MAX_FIELDS_PER_FORM) {
    return t("moderation.errors.formFieldsLimit", { max: MAX_FIELDS_PER_FORM });
  }
  if (form.enabled && !form.channel) {
    return t("moderation.errors.formNeedsChannel");
  }

  const ids = new Set<string>();

  for (const field of form.fields) {
    if (!field.id || ids.has(field.id))
      return t("moderation.errors.formFieldId");
    ids.add(field.id);

    if (!field.label?.trim() || field.label.length > 100) {
      return t("moderation.errors.formFieldLabel");
    }
    if (field.type === "select" && field.options.length === 0) {
      return t("moderation.errors.formFieldNeedsOption", {
        label: field.label,
      });
    }
    if (field.options.length > 25) {
      return t("moderation.errors.formFieldOptionsLimit", {
        label: field.label,
      });
    }
  }

  return null;
}
