import type { ButtonCustom, EmbedCustom, ModalCustom, SelectMenuCustom } from "@/lib/db/types";

/** Mirror of `utils.components` minus `scenarios` (scenarios are managed on a separate page). */
export interface ComponentsState {
  modals: ModalCustom[];
  embed: EmbedCustom[];
  buttons: ButtonCustom[];
  selectMenus: SelectMenuCustom[];
}

/** Tab keys mirror `keyof ComponentsState` so state operations stay aligned with UI tabs. */
export type ComponentsTab = keyof ComponentsState;

export const COMPONENT_ID_TYPE: Record<ComponentsTab, string> = {
  buttons: "btn",
  modals: "modal",
  embed: "embed",
  selectMenus: "select",
};

/** Factories for the "New <item>" button — produce a full default object with
 *  all required fields populated so the editor and live preview see a
 *  complete item from the very first keystroke. The caller mints the id. */
export function defaultButton(id: string): import("@/lib/db/types").ButtonCustom {
  return {
    id,
    name: "New button",
    label: "Button",
    style: "PRIMARY",
    disabled: false,
  };
}

export function defaultModal(id: string): import("@/lib/db/types").ModalCustom {
  return {
    id,
    title: "Modal title",
    fields: [],
  };
}

export function defaultEmbed(id: string): import("@/lib/db/types").EmbedCustom {
  return {
    id,
    name: "New embed",
    title: undefined,
    description: undefined,
    color: "#5865f2",
    fields: [],
    timestamp: false,
  };
}

export function defaultSelectMenu(id: string): import("@/lib/db/types").SelectMenuCustom {
  return {
    id,
    name: "New select menu",
    placeholder: "Choose an option…",
    minValues: 1,
    maxValues: 1,
    disabled: false,
    options: [],
  };
}

export const DEFAULT_FACTORIES: Record<
  ComponentsTab,
  (id: string) => ComponentsState[ComponentsTab][number]
> = {
  buttons: defaultButton as (id: string) => ComponentsState[ComponentsTab][number],
  modals: defaultModal as (id: string) => ComponentsState[ComponentsTab][number],
  embed: defaultEmbed as (id: string) => ComponentsState[ComponentsTab][number],
  selectMenus: defaultSelectMenu as (id: string) => ComponentsState[ComponentsTab][number],
};
