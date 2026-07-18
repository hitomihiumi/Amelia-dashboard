import type {
  ButtonCustom,
  EmbedCustom,
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
}
