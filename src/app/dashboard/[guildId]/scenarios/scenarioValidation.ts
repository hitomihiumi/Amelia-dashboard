import type { builder as enBuilder } from "@/i18n/messages/en/builder";
import type { Translator } from "@/i18n/translate";
import type { ScenarioActionType, ScenarioStep } from "@/lib/db/types";

// Pure validation helpers of the scenarios server actions. They live outside `actions.ts`
// because a "use server" module may only export async functions.

export const ACTION_TYPES = new Set<ScenarioActionType>([
  "show_modal",
  "send_message",
  "send_embed",
  "reply",
  "send_dm",
  "add_role",
  "remove_role",
  "create_thread",
  "set_variable",
  "edit_message",
  "delete_message",
]);

/** Actions that post or edit a message and can therefore send a layout instead of classic content. */
export const LAYOUT_CAPABLE_ACTIONS = new Set<ScenarioActionType>([
  "send_message",
  "send_embed",
  "reply",
  "edit_message",
  "send_dm",
]);

export type ScenarioErrorKey = keyof (typeof enBuilder)["errors"]["scenarios"];

/** Returns a function that translates a validation error and appends it to `errors`. */
export function makeReporter(errors: string[], t: Translator) {
  return (key: ScenarioErrorKey, ctx: string, params: Record<string, string | number> = {}) => {
    errors.push(t(`builder.errors.scenarios.${key}`, { ctx, ...params }));
  };
}

/** Ids of the saved component library, by collection. */
export interface LibraryIds {
  modals: Set<string>;
  embed: Set<string>;
  buttons: Set<string>;
  selectMenus: Set<string>;
  layouts: Set<string>;
}

export function validateAction(
  step: ScenarioStep,
  sctx: string,
  errors: string[],
  ids: LibraryIds,
  t: Translator,
) {
  const report = makeReporter(errors, t);
  const a = step.action;
  if (!a || !ACTION_TYPES.has(a.type)) {
    report("actionInvalid", sctx);
    return;
  }
  const rejectMissing = (id: string, set: Set<string>, label: string) => {
    if (!set.has(id)) report("unknownReference", sctx, { label, id });
  };

  // A layout replaces content, embeds, buttons and menus (Components V2 messages cannot carry
  // them), so when one is chosen the classic fields are neither required nor checked.
  // `""` means "layout mode, nothing picked yet" and must not be saved.
  if (LAYOUT_CAPABLE_ACTIONS.has(a.type) && a.layoutId != null) {
    if (typeof a.layoutId !== "string") report("layoutNotString", sctx);
    else if (a.layoutId === "") report("layoutRequired", sctx);
    else if (!ids.layouts.has(a.layoutId)) report("layoutMissing", sctx, { id: a.layoutId });
    return;
  }

  switch (a.type) {
    case "show_modal":
      if (!a.modalId) report("showModalNeedsModal", sctx);
      else rejectMissing(a.modalId, ids.modals, "modalId");
      break;
    case "send_message":
    case "send_embed":
    case "reply":
    case "edit_message":
      if (a.content != null && typeof a.content !== "string") report("contentNotString", sctx);
      if (a.embeds && !Array.isArray(a.embeds)) report("embedsNotArray", sctx);
      if (a.buttons && !Array.isArray(a.buttons)) report("buttonsNotArray", sctx);
      if (a.selectMenus && !Array.isArray(a.selectMenus)) report("selectMenusNotArray", sctx);
      if (Array.isArray(a.embeds)) a.embeds.forEach((e) => rejectMissing(e, ids.embed, "embeds"));
      if (Array.isArray(a.buttons))
        a.buttons.forEach((b) => rejectMissing(b, ids.buttons, "buttons"));
      if (Array.isArray(a.selectMenus))
        a.selectMenus.forEach((s) => rejectMissing(s, ids.selectMenus, "selectMenus"));
      if (a.embedId) rejectMissing(a.embedId, ids.embed, "embedId");
      break;
    case "add_role":
    case "remove_role":
      if (!a.roleId) report("roleRequired", sctx, { type: a.type });
      break;
    case "create_thread":
      if (!a.threadName) report("threadNameRequired", sctx);
      if (a.autoArchiveDuration && ![60, 1440, 4320, 10080].includes(a.autoArchiveDuration)) {
        report("archiveInvalid", sctx);
      }
      break;
    case "send_dm":
      if (a.dmContent != null && typeof a.dmContent !== "string")
        report("dmContentNotString", sctx);
      if (a.dmEmbedId) rejectMissing(a.dmEmbedId, ids.embed, "dmEmbedId");
      break;
    case "set_variable":
      if (!a.variableName) report("variableNameRequired", sctx);
      if (typeof a.variableValue !== "string") report("variableValueNotString", sctx);
      break;
    case "delete_message":
      if (typeof a.deleteOriginal !== "undefined" && typeof a.deleteOriginal !== "boolean") {
        report("deleteOriginalBool", sctx);
      }
      if (a.deleteDelay != null && (typeof a.deleteDelay !== "number" || a.deleteDelay < 0)) {
        report("deleteDelayInvalid", sctx);
      }
      break;
  }
}
