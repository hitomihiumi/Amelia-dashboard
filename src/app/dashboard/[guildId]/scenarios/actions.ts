"use server";

import { requireGuildAdmin } from "@/app/dashboard/[guildId]/actions";
import { getT } from "@/i18n/server";
import type { Translator } from "@/i18n/translate";
import { authOptions } from "@/lib/auth";
import { Guild } from "@/lib/db/Guild";
import { generateID } from "@/lib/db/generateID";
import {
  type ButtonCustom,
  type EmbedCustom,
  type LayoutCustom,
  type ModalCustom,
  SCENARIO_LIMITS,
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
import { type LibraryIds, makeReporter, validateAction } from "./scenarioValidation";

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
  layouts: LayoutCustom[];
}

function fail(error: string): GuildActionState {
  return { ok: false, error };
}

const COLLECTION_TAB_KEY = {
  buttons: "builder.components.tabs.buttons",
  selectMenus: "builder.components.tabs.selectMenus",
  modals: "builder.components.tabs.modals",
} as const;

export async function updateScenarios(
  guildId: string,
  formData: FormData,
): Promise<GuildActionState> {
  const t = await getT();
  const session = await getServerSession(authOptions);
  if (!session) return fail(t("builder.errors.notAuthorized"));

  const gate = await requireGuildAdmin(guildId);
  if (gate.error) return fail(gate.error);

  const raw = formData.get("scenarios");
  if (!raw) return fail(t("builder.errors.missingData"));

  let parsed: ScenarioCustom[];
  try {
    parsed = JSON.parse(raw as string) as ScenarioCustom[];
  } catch {
    return fail(t("builder.errors.invalidFormat"));
  }
  if (!Array.isArray(parsed)) return fail(t("builder.errors.scenarios.notArray"));

  if (parsed.length > SCENARIO_LIMITS.MAX_SCENARIOS_PER_GUILD) {
    return fail(
      t("builder.errors.scenarios.tooManyScenarios", {
        max: SCENARIO_LIMITS.MAX_SCENARIOS_PER_GUILD,
      }),
    );
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
    layouts: Array.isArray(components?.layouts) ? (components.layouts as LayoutCustom[]) : [],
  };
  const ids: LibraryIds = {
    modals: new Set(library.modals.map((m) => m.id)),
    embed: new Set(library.embed.map((e) => e.id)),
    buttons: new Set(library.buttons.map((b) => b.id)),
    selectMenus: new Set(library.selectMenus.map((s) => s.id)),
    layouts: new Set(library.layouts.map((l) => l.id)),
  };

  const errors: string[] = [];
  const report = makeReporter(errors, t);
  const scenarioIds = new Set<string>();

  parsed.forEach((scenario, i) => {
    const ctx = `scenario[${i}]`;
    if (!scenario.id) report("missingId", ctx);
    else if (scenarioIds.has(scenario.id)) report("duplicateId", ctx, { id: scenario.id });
    else scenarioIds.add(scenario.id);

    if (!scenario.name || scenario.name.length === 0 || scenario.name.length > 100) {
      report("nameLength", ctx);
    }
    if (typeof scenario.enabled !== "boolean") report("enabledBool", ctx);

    // Trigger is optional: a triggerless scenario is valid but never auto-fires.
    if (scenario.trigger != null) {
      if (!TRIGGER_TYPE_TO_COLLECTION[scenario.trigger.type as ScenarioTriggerType]) {
        report("triggerTypeInvalid", ctx);
      } else if (!scenario.trigger.componentId) {
        report("triggerComponentRequired", ctx);
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
            report("triggerComponentMissing", ctx, {
              id: scenario.trigger.componentId,
              collection: t(COLLECTION_TAB_KEY[coll as keyof typeof COLLECTION_TAB_KEY]),
            });
          }
        }
      }
    }
    if (Array.isArray(scenario.allowedRoles) && scenario.allowedRoles.some((r) => !r)) {
      report("allowedRolesEmpty", ctx);
    }
    if (Array.isArray(scenario.deniedRoles) && scenario.deniedRoles.some((r) => !r)) {
      report("deniedRolesEmpty", ctx);
    }
    if (Array.isArray(scenario.allowedChannels) && scenario.allowedChannels.some((c) => !c)) {
      report("allowedChannelsEmpty", ctx);
    }
    if (scenario.cooldown != null && scenario.cooldown < SCENARIO_LIMITS.MIN_COOLDOWN) {
      report("cooldownMin", ctx, { min: SCENARIO_LIMITS.MIN_COOLDOWN });
    }

    if (!Array.isArray(scenario.steps) || scenario.steps.length === 0) {
      report("needsStep", ctx);
    }
    if (scenario.steps.length > SCENARIO_LIMITS.MAX_STEPS_PER_SCENARIO) {
      report("tooManySteps", ctx, { max: SCENARIO_LIMITS.MAX_STEPS_PER_SCENARIO });
    }
    const stepIds = new Set<string>();
    scenario.steps.forEach((step, si) => {
      const sctx = `${ctx} step[${si}]`;
      if (!step.id) report("stepMissingId", sctx);
      else if (stepIds.has(step.id)) report("stepDuplicateId", sctx);
      else stepIds.add(step.id);
      validateAction(step, sctx, errors, ids, t);
      validateConditions(step, sctx, errors, t);
    });

    if (scenario.variables) {
      for (const [name, value] of Object.entries(scenario.variables)) {
        if (name.length > SCENARIO_LIMITS.MAX_VARIABLE_NAME_LENGTH) {
          report("variableNameLong", ctx, { name });
        }
        if (typeof value !== "string" || value.length > SCENARIO_LIMITS.MAX_VARIABLE_VALUE_LENGTH) {
          report("variableValueLong", ctx, { name });
        }
      }
    }

    // Strict dangling-link detection across steps.
    scenario.steps.forEach((step, si) => {
      const sctx = `${ctx} step[${si}]`;
      if (step.onSuccess && !stepIds.has(step.onSuccess)) {
        report("onSuccessMissing", sctx, { id: step.onSuccess });
      }
      if (step.onFailure && !stepIds.has(step.onFailure)) {
        report("onFailureMissing", sctx, { id: step.onFailure });
      }
      if (step.onSuccess === step.id) report("onSuccessSelf", sctx);
      if (step.onFailure === step.id) report("onFailureSelf", sctx);
    });
  });

  if (errors.length > 0) {
    return fail(`${t("builder.errors.validationFailed")}\n${errors.join("\n")}`);
  }

  await guild.set("utils.components.scenarios", parsed);
  revalidatePath(`/dashboard/${guildId}/scenarios`);
  return { ok: true };
}

function validateConditions(step: ScenarioStep, sctx: string, errors: string[], t: Translator) {
  const report = makeReporter(errors, t);
  if (!step.conditions) return;
  if (!Array.isArray(step.conditions)) {
    report("conditionsNotArray", sctx);
    return;
  }
  step.conditions.forEach((c, ci) => {
    const cctx = `${sctx} condition[${ci}]`;
    if (!CONDITION_TYPES.has(c.type)) report("conditionInvalidType", cctx);
    if (!CONDITION_OPERATORS.has(c.operator)) report("conditionInvalidOperator", cctx);
    if (typeof c.value !== "string") report("conditionValueNotString", cctx);
    if ((c.type === "input" || c.type === "variable") && !c.field) {
      report("conditionFieldRequired", cctx, { type: c.type });
    }
  });
  if (step.conditionLogic && step.conditionLogic !== "and" && step.conditionLogic !== "or") {
    report("conditionLogicInvalid", sctx);
  }
}

/**
 * Create a brand-new minimal scenario and persist it immediately, returning the new id.
 * Used by ScenariosManager so the slug page can find the scenario after navigation.
 */
export async function createScenarioAction(
  guildId: string,
): Promise<{ ok: true; scenarioId: string } | { ok: false; error: string }> {
  const t = await getT();
  const session = await getServerSession(authOptions);
  if (!session) return { ok: false, error: t("builder.errors.notAuthorized") };

  const gate = await requireGuildAdmin(guildId);
  if (gate.error) return { ok: false, error: gate.error };

  const guild = new Guild(guildId);
  const existing = (await guild.get("utils.components.scenarios")) as ScenarioCustom[];
  if (!Array.isArray(existing)) {
    return { ok: false, error: t("builder.errors.storeUnavailable") };
  }
  if (existing.length >= SCENARIO_LIMITS.MAX_SCENARIOS_PER_GUILD) {
    return { ok: false, error: t("builder.errors.scenarios.limitReached") };
  }

  const scenarioId = generateID(guildId, "scenario");
  const stepId = generateID(guildId, "step");
  const now = Date.now();
  const scenario: ScenarioCustom = {
    id: scenarioId,
    name: t("builder.defaults.scenario.name"),
    description: "",
    enabled: false,
    trigger: null,
    steps: [
      {
        id: stepId,
        order: 0,
        name: t("builder.defaults.scenario.stepName"),
        action: {
          type: "reply",
          content: t("builder.defaults.scenario.replyContent"),
          ephemeral: true,
        },
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
  const t = await getT();
  const session = await getServerSession(authOptions);
  if (!session) return fail(t("builder.errors.notAuthorized"));

  const gate = await requireGuildAdmin(guildId);
  if (gate.error) return fail(gate.error);

  const guild = new Guild(guildId);
  const existing = (await guild.get("utils.components.scenarios")) as ScenarioCustom[];
  if (!Array.isArray(existing)) return fail(t("builder.errors.storeUnavailable"));

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
  const t = await getT();
  const session = await getServerSession(authOptions);
  if (!session) return fail(t("builder.errors.notAuthorized"));
  const gate = await requireGuildAdmin(guildId);
  if (gate.error) return fail(gate.error);

  const guild = new Guild(guildId);
  const existing = (await guild.get("utils.components.scenarios")) as ScenarioCustom[];
  if (!Array.isArray(existing)) return fail(t("builder.errors.storeUnavailable"));

  const next = existing.filter((s) => s.id !== scenarioId);
  await guild.set("utils.components.scenarios", next);
  revalidatePath(`/dashboard/${guildId}/scenarios`);
  return { ok: true };
}
