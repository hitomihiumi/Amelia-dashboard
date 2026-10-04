import type { Translator } from "@/i18n/translate";
import { generateID } from "@/lib/db/generateID";
import type {
  ButtonCustom,
  EmbedCustom,
  LayoutCustom,
  ModalCustom,
  SelectMenuCustom,
} from "@/lib/db/types";

/** Mirror of `utils.components` minus `scenarios` (scenarios are managed on a separate page). */
export interface ComponentsState {
  modals: ModalCustom[];
  embed: EmbedCustom[];
  buttons: ButtonCustom[];
  selectMenus: SelectMenuCustom[];
  layouts: LayoutCustom[];
}

/** Tab keys mirror `keyof ComponentsState` so state operations stay aligned with UI tabs. */
export type ComponentsTab = keyof ComponentsState;

export const COMPONENT_ID_TYPE: Record<ComponentsTab, string> = {
  buttons: "btn",
  modals: "modal",
  embed: "embed",
  selectMenus: "select",
  layouts: "layout",
};

export const COMPONENTS_TABS: readonly ComponentsTab[] = [
  "buttons",
  "modals",
  "embed",
  "selectMenus",
  "layouts",
];

/** `?tab=layouts` from a link, or null when it names no tab. */
export function parseComponentsTab(value: string | null | undefined): ComponentsTab | null {
  return COMPONENTS_TABS.find((tab) => tab === value) ?? null;
}

/** Factories for the "New <item>" button — produce a full default object with
 *  all required fields populated so the editor and live preview see a
 *  complete item from the very first keystroke. The caller mints the id and
 *  passes the translator so default names follow the dashboard language. */
export function defaultButton(id: string, t: Translator): import("@/lib/db/types").ButtonCustom {
  return {
    id,
    name: t("builder.defaults.button.name"),
    label: t("builder.defaults.button.label"),
    style: "PRIMARY",
    disabled: false,
  };
}

export function defaultModal(id: string, t: Translator): import("@/lib/db/types").ModalCustom {
  return {
    id,
    title: t("builder.defaults.modal.title"),
    fields: [],
  };
}

export function defaultEmbed(id: string, t: Translator): import("@/lib/db/types").EmbedCustom {
  return {
    id,
    name: t("builder.defaults.embed.name"),
    title: undefined,
    description: undefined,
    color: "#5865f2",
    fields: [],
    timestamp: false,
  };
}

export function defaultSelectMenu(id: string, t: Translator): import("@/lib/db/types").SelectMenuCustom {
  return {
    id,
    name: t("builder.defaults.selectMenu.name"),
    placeholder: t("builder.defaults.selectMenu.placeholder"),
    minValues: 1,
    maxValues: 1,
    disabled: false,
    options: [],
  };
}

/** A new layout is never empty: a container with a title, a divider and a text, so the preview has something to show. */
export function defaultLayout(id: string, t: Translator): LayoutCustom {
  return {
    id,
    name: t("layouts.defaults.name"),
    components: [
      {
        type: "container",
        id: generateID(),
        accentColor: "#5865f2",
        spoiler: false,
        children: [
          { type: "text", id: generateID(), content: `## ${t("layouts.defaults.title")}` },
          { type: "separator", id: generateID(), divider: true, spacing: "small" },
          {
            type: "text",
            id: generateID(),
            content: t("layouts.defaults.text", { token: "{user.mention}" }),
          },
        ],
      },
    ],
  };
}

export const DEFAULT_FACTORIES: Record<
  ComponentsTab,
  (id: string, t: Translator) => ComponentsState[ComponentsTab][number]
> = {
  buttons: defaultButton as (id: string, t: Translator) => ComponentsState[ComponentsTab][number],
  modals: defaultModal as (id: string, t: Translator) => ComponentsState[ComponentsTab][number],
  embed: defaultEmbed as (id: string, t: Translator) => ComponentsState[ComponentsTab][number],
  selectMenus: defaultSelectMenu as (id: string, t: Translator) => ComponentsState[ComponentsTab][number],
  layouts: defaultLayout as (id: string, t: Translator) => ComponentsState[ComponentsTab][number],
};
