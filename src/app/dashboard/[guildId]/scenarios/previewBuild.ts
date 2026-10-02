import type { Translator } from "@/i18n/translate";
import type { PreviewMessage } from "@/components/dashboard/discord/preview/DiscordPreview";
import type {
  ButtonCustom,
  EmbedCustom,
  ModalCustom,
  ScenarioStep,
  SelectMenuCustom,
} from "@/lib/db/types";
import type { DiscordRole } from "@/lib/discord/role-style";
import type { ComponentsLibrary } from "./scenariosTypes";

/** Build a representative Discord preview message for a single step.
 * The author is left unset so the preview resolves the guild's real bot
 * identity from DiscordPreviewContext. */
export function buildPreviewForStep(
  step: ScenarioStep,
  library: ComponentsLibrary,
  t: Translator,
  role?: DiscordRole,
): PreviewMessage | null {
  const action = step.action;
  if (!action) return null;

  const findEmbed = (id: string): EmbedCustom | undefined => library.embed.find((e) => e.id === id);
  const findButton = (id: string): ButtonCustom | undefined =>
    library.buttons.find((b) => b.id === id);
  const findMenu = (id: string): SelectMenuCustom | undefined =>
    library.selectMenus.find((s) => s.id === id);
  const findModal = (id: string): ModalCustom | undefined =>
    library.modals.find((m) => m.id === id);

  const embeds = (action.embeds ?? []).map(findEmbed).filter(Boolean) as EmbedCustom[];
  if (action.embedId) {
    const e = findEmbed(action.embedId);
    if (e) embeds.push(e);
  }
  const buttons = (action.buttons ?? []).map(findButton).filter(Boolean) as ButtonCustom[];
  const selectMenus = (action.selectMenus ?? [])
    .map(findMenu)
    .filter(Boolean) as SelectMenuCustom[];

  switch (action.type) {
    case "reply":
    case "send_message":
    case "send_embed":
      return {
        content: action.content || (embeds.length > 0 ? undefined : t("builder.preview.message")),
        embeds,
        buttons,
        selectMenus,
        asDm: false,
      };
    case "edit_message":
      return {
        content: action.content || t("builder.preview.editedMessage"),
        embeds,
        buttons,
        selectMenus,
        asDm: false,
      };
    case "show_modal":
      return action.modalId ? { modal: findModal(action.modalId) ?? null } : null;
    case "send_dm":
      return {
        asDm: true,
        content: action.dmContent || t("builder.preview.directMessage"),
        embeds: action.dmEmbedId
          ? ([findEmbed(action.dmEmbedId)].filter(Boolean) as EmbedCustom[])
          : [],
      };
    case "add_role":
      return {
        content: role
          ? t("builder.preview.roleAdded", { role: `<@&${role.id}>` })
          : t("builder.preview.roleAddedGeneric"),
      };
    case "remove_role":
      return {
        content: role
          ? t("builder.preview.roleRemoved", { role: `<@&${role.id}>` })
          : t("builder.preview.roleRemovedGeneric"),
      };
    case "create_thread":
      return {
        embeds: [
          {
            id: "preview-thread",
            name: t("builder.preview.thread"),
            title: action.threadName || t("builder.preview.thread"),
            description: t("builder.preview.threadDescription", {
              minutes: action.autoArchiveDuration ?? 1440,
            }),
            color: "#5865f2",
          },
        ],
      };
    case "set_variable":
      return {
        content: t("builder.preview.setVariable", {
          name: action.variableName || t("builder.preview.variableFallback"),
          value: action.variableValue || "",
        }),
      };
    case "delete_message":
      return {
        content: action.deleteOriginal
          ? t("builder.preview.deleteOriginal")
          : action.deleteDelay
            ? t("builder.preview.deleteTargetDelay", { ms: action.deleteDelay })
            : t("builder.preview.deleteTarget"),
      };
    default:
      return null;
  }
}
