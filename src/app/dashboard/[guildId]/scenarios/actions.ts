"use server";

import { requireGuildAdmin } from "@/app/dashboard/[guildId]/actions";
import { authOptions } from "@/lib/auth";
import { Guild } from "@/lib/db/Guild";
import { generateID } from "@/lib/db/generateID";
import {
  type ButtonCustom,
  type EmbedCustom,
  type ModalCustom,
  SCENARIO_LIMITS,
  type ScenarioActionType,
  type ScenarioConditionOperator,
  type ScenarioConditionType,
  type ScenarioCustom,
  type ScenarioStep,
  type ScenarioTriggerType,
  type SelectMenuCustom,
} from "@/lib/db/types";
import type { GuildActionState } from "@/types/dashboard";
import { getServerSession } from "next-auth";
import { revalidatePath } from "next/cache";

const TRIGGER_TYPE_TO_COLLECTION: Record<ScenarioTriggerType, keyof ComponentsLibrary> = {
  button: "buttons",
  select_menu: "selectMenus",
  modal_submit: "modals",
};

const TRIGGER_TYPE_TOKEN: Record<ScenarioTriggerType, string> = {
  button: "btn",
  select_menu: "select",
  modal_submit: "modal",
};

const ACTION_TYPES = new Set<ScenarioActionType>([
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
const CONDITION_TYPES = new Set<ScenarioConditionType>([
  "user",
  "input",
  "variable",
  "role",
  "channel",
  "selected",
]);
const CONDITION_OPERATORS = new Set<ScenarioConditionOperator>([
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "starts_with",
  "ends_with",
  "greater_than",
  "less_than",
  "has_role",
  "not_has_role",
  "in_channel",
  "not_in_channel",
  "is_empty",
  "is_not_empty",
]);

interface ComponentsLibrary {
  modals: ModalCustom[];
  embed: EmbedCustom[];
  buttons: ButtonCustom[];
  selectMenus: SelectMenuCustom[];
}

function fail(error: string): GuildActionState {
  return { ok: false, error };
}

export async function updateScenarios(
  guildId: string,
  formData: FormData,
): Promise<GuildActionState> {
  const session = await getServerSession(authOptions);
  if (!session) return fail("Not authorized.");

  const gate = await requireGuildAdmin(guildId);
  if (gate.error) return fail(gate.error);

  const raw = formData.get("scenarios");
  if (!raw) return fail("Missing data");

  let parsed: ScenarioCustom[];
  try {
    parsed = JSON.parse(raw as string) as ScenarioCustom[];
  } catch {
    return fail("Invalid data format");
  }
  if (!Array.isArray(parsed)) return fail("Scenarios must be an array");

  if (parsed.length > SCENARIO_LIMITS.MAX_SCENARIOS_PER_GUILD) {
    return fail(`A guild may have at most ${SCENARIO_LIMITS.MAX_SCENARIOS_PER_GUILD} scenarios`);
  }

  // Load the actual component library to validate dangling references strictly.
  const guild = new Guild(guildId);
  const components = await guild.get("utils.components");
  const library: ComponentsLibrary = {
    modals: Array.isArray(components?.modals) ? (components.modals as ModalCustom[]) : [],
    embed: Array.isArray(components?.embed) ? (components.embed as EmbedCustom[]) : [],
    buttons: Array.isArray(components?.buttons) ? (components.buttons as ButtonCustom[]) : [],
    selectMenus: Array.isArray(components?.selectMenus)
      ? (components.selectMenus as SelectMenuCustom[])
      : [],
  };
  const ids = {
    modals: new Set(library.modals.map((m) => m.id)),
    embed: new Set(library.embed.map((e) => e.id)),
    buttons: new Set(library.buttons.map((b) => b.id)),
    selectMenus: new Set(library.selectMenus.map((s) => s.id)),
  };

  const errors: string[] = [];
  const scenarioIds = new Set<string>();

  parsed.forEach((scenario, i) => {
    const ctx = `scenario[${i}]`;
    if (!scenario.id) errors.push(`${ctx}: missing id`);
    else if (scenarioIds.has(scenario.id)) errors.push(`${ctx}: duplicate id "${scenario.id}"`);
    else scenarioIds.add(scenario.id);

    if (!scenario.name || scenario.name.length === 0 || scenario.name.length > 100) {
      errors.push(`${ctx}: name must be 1-100 characters`);
    }
    if (typeof scenario.enabled !== "boolean") errors.push(`${ctx}: enabled must be boolean`);

    // Trigger is optional: a triggerless scenario is valid but never auto-fires.
    if (scenario.trigger != null) {
      if (!TRIGGER_TYPE_TO_COLLECTION[scenario.trigger.type as ScenarioTriggerType]) {
        errors.push(`${ctx}: trigger.type invalid`);
      } else if (!scenario.trigger.componentId) {
        errors.push(`${ctx}: trigger.componentId required`);
      } else {
        const coll = TRIGGER_TYPE_TO_COLLECTION[scenario.trigger.type as ScenarioTriggerType];
        if (coll && !ids[coll as keyof typeof ids].has(scenario.trigger.componentId)) {
          const token = TRIGGER_TYPE_TOKEN[scenario.trigger.type as ScenarioTriggerType];
          // Also accept freshly-generated ids of the right shape (e.g. a brand-new component
          // created in the same unsaved Components session that hasn't been saved yet). This
          // lets a user stage a trigger together with a brand-new component without a chicken-
          // and-egg failure.
          const lazyRe = new RegExp(`^CI_${token}_[A-Za-z0-9]+_[A-Za-z0-9]+$`);
          if (!lazyRe.test(scenario.trigger.componentId)) {
            errors.push(
              `${ctx}: trigger component "${scenario.trigger.componentId}" does not exist among ${coll}`,
            );
          }
        }
      }
    }
    if (Array.isArray(scenario.allowedRoles) && scenario.allowedRoles.some((r) => !r)) {
      errors.push(`${ctx}: allowedRoles contain empty id`);
    }
    if (Array.isArray(scenario.deniedRoles) && scenario.deniedRoles.some((r) => !r)) {
      errors.push(`${ctx}: deniedRoles contain empty id`);
    }
    if (Array.isArray(scenario.allowedChannels) && scenario.allowedChannels.some((c) => !c)) {
      errors.push(`${ctx}: allowedChannels contain empty id`);
    }
    if (scenario.cooldown != null && scenario.cooldown < SCENARIO_LIMITS.MIN_COOLDOWN) {
      errors.push(`${ctx}: cooldown must be >= ${SCENARIO_LIMITS.MIN_COOLDOWN}s`);
    }

    if (!Array.isArray(scenario.steps) || scenario.steps.length === 0) {
      errors.push(`${ctx}: at least one step is required`);
    }
    if (scenario.steps.length > SCENARIO_LIMITS.MAX_STEPS_PER_SCENARIO) {
      errors.push(`${ctx}: too many steps (max ${SCENARIO_LIMITS.MAX_STEPS_PER_SCENARIO})`);
    }
    const stepIds = new Set<string>();
    scenario.steps.forEach((step, si) => {
      const sctx = `${ctx} step[${si}]`;
      if (!step.id) errors.push(`${sctx}: missing id`);
      else if (stepIds.has(step.id)) errors.push(`${sctx}: duplicate step id`);
      else stepIds.add(step.id);
      validateAction(step, sctx, errors, ids, TRIGGER_TYPE_TO_COLLECTION, TRIGGER_TYPE_TOKEN);
      validateConditions(step, sctx, errors);
    });

    if (scenario.variables) {
      for (const [name, value] of Object.entries(scenario.variables)) {
        if (name.length > SCENARIO_LIMITS.MAX_VARIABLE_NAME_LENGTH) {
          errors.push(`${ctx}: variable "${name}" name too long`);
        }
        if (typeof value !== "string" || value.length > SCENARIO_LIMITS.MAX_VARIABLE_VALUE_LENGTH) {
          errors.push(`${ctx}: variable "${name}" value too long`);
        }
      }
    }

    // Strict dangling-link detection across steps.
    scenario.steps.forEach((step, si) => {
      const sctx = `${ctx} step[${si}]`;
      if (step.onSuccess && !stepIds.has(step.onSuccess)) {
        errors.push(`${sctx}: onSuccess points to missing step "${step.onSuccess}"`);
      }
      if (step.onFailure && !stepIds.has(step.onFailure)) {
        errors.push(`${sctx}: onFailure points to missing step "${step.onFailure}"`);
      }
      if (step.onSuccess === step.id) errors.push(`${sctx}: onSuccess references itself`);
      if (step.onFailure === step.id) errors.push(`${sctx}: onFailure references itself`);
    });
  });

  if (errors.length > 0) {
    return fail("Validation failed:\n" + errors.join("\n"));
  }

  await guild.set("utils.components.scenarios", parsed);
  revalidatePath(`/dashboard/${guildId}/scenarios`);
  return { ok: true };
}

function validateAction(
  step: ScenarioStep,
  sctx: string,
  errors: string[],
  ids: { modals: Set<string>; embed: Set<string>; buttons: Set<string>; selectMenus: Set<string> },
  _triggerMap: Record<ScenarioTriggerType, keyof ComponentsLibrary | null>,
  _triggerToken: Record<ScenarioTriggerType, string>,
) {
  const a = step.action;
  if (!a || !ACTION_TYPES.has(a.type)) {
    errors.push(`${sctx}: action.type invalid`);
    return;
  }
  const rejectMissing = (id: string, set: Set<string>, label: string) => {
    if (!set.has(id)) errors.push(`${sctx}: ${label} references unknown id "${id}"`);
  };

  switch (a.type) {
    case "show_modal":
      if (!a.modalId) errors.push(`${sctx}: show_modal requires modalId`);
      else rejectMissing(a.modalId, ids.modals, "modalId");
      break;
    case "send_message":
    case "send_embed":
    case "reply":
    case "edit_message":
      if (a.content != null && typeof a.content !== "string")
        errors.push(`${sctx}: content must be string`);
      if (a.embeds && !Array.isArray(a.embeds)) errors.push(`${sctx}: embeds must be array`);
      if (a.buttons && !Array.isArray(a.buttons)) errors.push(`${sctx}: buttons must be array`);
      if (a.selectMenus && !Array.isArray(a.selectMenus))
        errors.push(`${sctx}: selectMenus must be array`);
      if (Array.isArray(a.embeds)) a.embeds.forEach((e) => rejectMissing(e, ids.embed, "embeds"));
      if (Array.isArray(a.buttons))
        a.buttons.forEach((b) => rejectMissing(b, ids.buttons, "buttons"));
      if (Array.isArray(a.selectMenus))
        a.selectMenus.forEach((s) => rejectMissing(s, ids.selectMenus, "selectMenus"));
      if (a.embedId) rejectMissing(a.embedId, ids.embed, "embedId");
      break;
    case "add_role":
    case "remove_role":
      if (!a.roleId) errors.push(`${sctx}: ${a.type} requires roleId`);
      break;
    case "create_thread":
      if (!a.threadName) errors.push(`${sctx}: create_thread requires threadName`);
      if (a.autoArchiveDuration && ![60, 1440, 4320, 10080].includes(a.autoArchiveDuration)) {
        errors.push(`${sctx}: autoArchiveDuration invalid`);
      }
      break;
    case "send_dm":
      if (a.dmContent != null && typeof a.dmContent !== "string")
        errors.push(`${sctx}: dmContent must be string`);
      if (a.dmEmbedId) rejectMissing(a.dmEmbedId, ids.embed, "dmEmbedId");
      break;
    case "set_variable":
      if (!a.variableName) errors.push(`${sctx}: set_variable requires variableName`);
      if (typeof a.variableValue !== "string")
        errors.push(`${sctx}: set_variable.variableValue must be string`);
      break;
    case "delete_message":
      if (typeof a.deleteOriginal !== "undefined" && typeof a.deleteOriginal !== "boolean") {
        errors.push(`${sctx}: deleteOriginal must be boolean`);
      }
      if (a.deleteDelay != null && (typeof a.deleteDelay !== "number" || a.deleteDelay < 0)) {
        errors.push(`${sctx}: deleteDelay must be a non-negative number`);
      }
      break;
  }
}

function validateConditions(step: ScenarioStep, sctx: string, errors: string[]) {
  if (!step.conditions) return;
  if (!Array.isArray(step.conditions)) {
    errors.push(`${sctx}: conditions must be an array`);
    return;
  }
  step.conditions.forEach((c, ci) => {
    const cctx = `${sctx} condition[${ci}]`;
    if (!CONDITION_TYPES.has(c.type)) errors.push(`${cctx}: invalid type`);
    if (!CONDITION_OPERATORS.has(c.operator)) errors.push(`${cctx}: invalid operator`);
    if (typeof c.value !== "string") errors.push(`${cctx}: value must be string`);
    if ((c.type === "input" || c.type === "variable") && !c.field) {
      errors.push(`${cctx}: field is required for type "${c.type}"`);
    }
  });
  if (step.conditionLogic && step.conditionLogic !== "and" && step.conditionLogic !== "or") {
    errors.push(`${sctx}: conditionLogic must be "and" or "or"`);
  }
}

/**
 * Create a brand-new minimal scenario and persist it immediately, returning the new id.
 * Used by ScenariosManager so the slug page can find the scenario after navigation.
 */
export async function createScenarioAction(
  guildId: string,
): Promise<{ ok: true; scenarioId: string } | { ok: false; error: string }> {
  const session = await getServerSession(authOptions);
  if (!session) return { ok: false, error: "Not authorized." };

  const gate = await requireGuildAdmin(guildId);
  if (gate.error) return { ok: false, error: gate.error };

  const guild = new Guild(guildId);
  const existing = (await guild.get("utils.components.scenarios")) as ScenarioCustom[];
  if (!Array.isArray(existing)) {
    return { ok: false, error: "Components store unavailable." };
  }
  if (existing.length >= SCENARIO_LIMITS.MAX_SCENARIOS_PER_GUILD) {
    return { ok: false, error: "Scenario limit reached." };
  }

  const scenarioId = generateID(guildId, "scenario");
  const stepId = generateID(guildId, "step");
  const now = Date.now();
  const scenario: ScenarioCustom = {
    id: scenarioId,
    name: "New scenario",
    description: "",
    enabled: false,
    trigger: null,
    steps: [
      {
        id: stepId,
        order: 0,
        name: "Step 1",
        action: { type: "reply", content: "Hello world", ephemeral: true },
      },
    ],
    createdAt: now,
    updatedAt: now,
  };

  await guild.set("utils.components.scenarios", [...existing, scenario]);
  revalidatePath(`/dashboard/${guildId}/scenarios`);
  revalidatePath(`/dashboard/${guildId}/scenarios/${scenarioId}`);
  return { ok: true, scenarioId };
}

/**
 * Update a single scenario by id (used by the slug editor page via UnsavedChangesContext).
 * Reuses the full-array strict validation path; the array form simply replaces one entry.
 */
export async function updateScenarioAction(
  guildId: string,
  scenario: ScenarioCustom,
): Promise<GuildActionState> {
  const session = await getServerSession(authOptions);
  if (!session) return fail("Not authorized.");

  const gate = await requireGuildAdmin(guildId);
  if (gate.error) return fail(gate.error);

  const guild = new Guild(guildId);
  const existing = (await guild.get("utils.components.scenarios")) as ScenarioCustom[];
  if (!Array.isArray(existing)) return fail("Components store unavailable.");

  const idx = existing.findIndex((s) => s.id === scenario.id);
  const next =
    idx >= 0 ? existing.map((s) => (s.id === scenario.id ? scenario : s)) : [...existing, scenario];

  const fd = new FormData();
  fd.set("scenarios", JSON.stringify(next));
  return updateScenarios(guildId, fd);
}

/**
 * Delete a single scenario by id.
 */
export async function deleteScenarioAction(
  guildId: string,
  scenarioId: string,
): Promise<GuildActionState> {
  const session = await getServerSession(authOptions);
  if (!session) return fail("Not authorized.");
  const gate = await requireGuildAdmin(guildId);
  if (gate.error) return fail(gate.error);

  const guild = new Guild(guildId);
  const existing = (await guild.get("utils.components.scenarios")) as ScenarioCustom[];
  if (!Array.isArray(existing)) return fail("Components store unavailable.");

  const next = existing.filter((s) => s.id !== scenarioId);
  await guild.set("utils.components.scenarios", next);
  revalidatePath(`/dashboard/${guildId}/scenarios`);
  return { ok: true };
}
