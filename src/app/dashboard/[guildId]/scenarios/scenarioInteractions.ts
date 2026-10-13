import type {
  ButtonCustom,
  LayoutComponent,
  LayoutCustom,
  ModalCustom,
  ScenarioAction,
  ScenarioActionType,
  ScenarioStep,
  SelectMenuCustom,
} from "@/lib/db/types";

// What a step can be answered with: the modal it shows, or the buttons / select menus it puts on a
// message. Each answer can be wired to the step that continues the scenario (`step.onInteraction`).
// Pure helpers, shared by the canvas (handles) and the server action (validation); the bot keeps a
// twin in `src/helpers/custom/scenarioFlow.ts` that decides which answers it will pick up.

export type AwaitedKind = "modal" | "button" | "select";

export interface AwaitedComponent {
  /** Id of the modal / button / select menu, also the key of `step.onInteraction`. */
  id: string;
  kind: AwaitedKind;
  /** Name shown next to the handle; empty when the component no longer exists. */
  label: string;
}

/** The part of the component library the helpers read. */
export interface InteractionLibrary {
  modals?: ModalCustom[];
  buttons?: ButtonCustom[];
  selectMenus?: SelectMenuCustom[];
  layouts?: LayoutCustom[];
}

/** A DM is left out: a click in a DM never reaches a guild scenario. */
const MESSAGE_ACTIONS = new Set<ScenarioActionType>([
  "send_message",
  "send_embed",
  "reply",
  "edit_message",
]);

/** Prefix of the canvas handle that stands for one answer. */
export const INTERACTION_HANDLE_PREFIX = "on:";

export function interactionHandleId(componentId: string): string {
  return `${INTERACTION_HANDLE_PREFIX}${componentId}`;
}

export function componentIdOfHandle(handle: string | null | undefined): string | null {
  return handle?.startsWith(INTERACTION_HANDLE_PREFIX)
    ? handle.slice(INTERACTION_HANDLE_PREFIX.length)
    : null;
}

function layoutComponentIds(
  components: LayoutComponent[],
  out: { id: string; kind: AwaitedKind }[],
): void {
  for (const component of components) {
    switch (component.type) {
      case "container":
        layoutComponentIds(component.children, out);
        break;
      case "section":
        if (component.accessory?.kind === "button") {
          out.push({ id: component.accessory.buttonId, kind: "button" });
        }
        break;
      case "actions":
        for (const id of component.buttons) out.push({ id, kind: "button" });
        if (component.selectMenuId) out.push({ id: component.selectMenuId, kind: "select" });
        break;
    }
  }
}

/** The answers an action can be continued from, in the order they appear in the message. */
export function awaitedComponents(
  action: ScenarioAction | undefined,
  library: InteractionLibrary,
): AwaitedComponent[] {
  if (!action) return [];

  if (action.type === "show_modal") {
    if (!action.modalId) return [];
    const modal = library.modals?.find((m) => m.id === action.modalId);
    return [{ id: action.modalId, kind: "modal", label: modal?.title ?? "" }];
  }

  if (!MESSAGE_ACTIONS.has(action.type)) return [];

  const raw: { id: string; kind: AwaitedKind }[] = [];
  if (action.layoutId) {
    const layout = library.layouts?.find((l) => l.id === action.layoutId);
    if (layout) layoutComponentIds(layout.components ?? [], raw);
  } else {
    for (const id of action.buttons ?? []) raw.push({ id, kind: "button" });
    for (const id of action.selectMenus ?? []) raw.push({ id, kind: "select" });
  }

  const seen = new Set<string>();
  const result: AwaitedComponent[] = [];
  for (const { id, kind } of raw) {
    if (seen.has(id)) continue;
    seen.add(id);
    if (kind === "button") {
      const button = library.buttons?.find((b) => b.id === id);
      // Link buttons open a URL, Discord never reports a click on them
      if (button?.style === "LINK") continue;
      result.push({ id, kind, label: button ? button.name || button.label : "" });
    } else {
      const menu = library.selectMenus?.find((s) => s.id === id);
      result.push({ id, kind, label: menu ? menu.name || menu.placeholder || "" : "" });
    }
  }
  return result;
}

/** Steps that only run as the answer to another step: nothing falls through into them. */
export function continuationTargetIds(steps: Pick<ScenarioStep, "onInteraction">[]): Set<string> {
  const targets = new Set<string>();
  for (const step of steps) {
    for (const target of Object.values(step.onInteraction ?? {})) targets.add(target);
  }
  return targets;
}
