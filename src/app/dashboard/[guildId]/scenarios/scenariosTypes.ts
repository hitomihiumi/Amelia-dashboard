import type {
  ButtonCustom,
  EmbedCustom,
  LayoutCustom,
  ModalCustom,
  ScenarioCustom,
  SelectMenuCustom,
} from "@/lib/db/types";

/** Aggregated custom-component library exposed to the scenario editor. */
export interface ComponentsLibrary {
  modals: ModalCustom[];
  embed: EmbedCustom[];
  buttons: ButtonCustom[];
  selectMenus: SelectMenuCustom[];
  scenarios: ScenarioCustom[];
  /** Components V2 layouts a message action can send instead of content/embeds. */
  layouts: LayoutCustom[];
}
