import type { MessageKey } from "@/i18n/messages/types";
import type { Translator } from "@/i18n/translate";
import type { ButtonCustom, SelectMenuCustom } from "@/lib/db/types";
import { type Block, type BlockKind, actionsMode, blockKindOf } from "@/lib/layouts/blocks";
import type { ReactNode } from "react";
import {
  LuImages,
  LuListChecks,
  LuMousePointerClick,
  LuPanelRight,
  LuSeparatorHorizontal,
  LuSquareDashed,
  LuType,
} from "react-icons/lu";
import { buttonName } from "./pickers";

export interface KindMeta {
  icon: (size?: number) => ReactNode;
  label: MessageKey;
  description: MessageKey;
}

export const KIND_META: Record<BlockKind, KindMeta> = {
  text: {
    icon: (size = 16) => <LuType size={size} aria-hidden />,
    label: "layouts.blocks.text.label",
    description: "layouts.blocks.text.description",
  },
  section: {
    icon: (size = 16) => <LuPanelRight size={size} aria-hidden />,
    label: "layouts.blocks.section.label",
    description: "layouts.blocks.section.description",
  },
  gallery: {
    icon: (size = 16) => <LuImages size={size} aria-hidden />,
    label: "layouts.blocks.gallery.label",
    description: "layouts.blocks.gallery.description",
  },
  separator: {
    icon: (size = 16) => <LuSeparatorHorizontal size={size} aria-hidden />,
    label: "layouts.blocks.separator.label",
    description: "layouts.blocks.separator.description",
  },
  buttons: {
    icon: (size = 16) => <LuMousePointerClick size={size} aria-hidden />,
    label: "layouts.blocks.buttons.label",
    description: "layouts.blocks.buttons.description",
  },
  select: {
    icon: (size = 16) => <LuListChecks size={size} aria-hidden />,
    label: "layouts.blocks.select.label",
    description: "layouts.blocks.select.description",
  },
  container: {
    icon: (size = 16) => <LuSquareDashed size={size} aria-hidden />,
    label: "layouts.blocks.container.label",
    description: "layouts.blocks.container.description",
  },
};

/** The groups of the "Add block" menu. */
export const ADD_GROUPS: Array<{ title: MessageKey; kinds: BlockKind[] }> = [
  { title: "layouts.add.groupContent", kinds: ["text", "section", "gallery", "separator"] },
  { title: "layouts.add.groupInteractive", kinds: ["buttons", "select"] },
  { title: "layouts.add.groupLayout", kinds: ["container"] },
];

const MAX_SUMMARY = 70;

function oneLine(text: string): string {
  const line =
    text
      .split("\n")
      .map((l) => l.replace(/^\s*(#{1,3}\s+|>\s?|[-*]\s+)/, "").trim())
      .find(Boolean) ?? "";
  const clean = line.replace(/[*_~`|]/g, "");
  return clean.length > MAX_SUMMARY ? `${clean.slice(0, MAX_SUMMARY - 1)}…` : clean;
}

/** One line that tells blocks apart when they are collapsed. */
export function summarize(
  block: Block,
  t: Translator,
  library: { buttons: ButtonCustom[]; selectMenus: SelectMenuCustom[] },
): string {
  switch (block.type) {
    case "text":
      return oneLine(block.content) || t("layouts.summary.emptyText");
    case "section":
      return oneLine(block.texts[0] ?? "") || t("layouts.summary.emptyText");
    case "gallery":
      return t("layouts.summary.images", { count: block.items.length });
    case "separator":
      return t(block.divider ? "layouts.summary.dividerLine" : "layouts.summary.dividerSpace", {
        spacing: t(block.spacing === "large" ? "layouts.separator.large" : "layouts.separator.small"),
      });
    case "actions": {
      if (actionsMode(block) === "select") {
        const menu = library.selectMenus.find((m) => m.id === block.selectMenuId);
        return menu ? menu.name || menu.placeholder || t("builder.fallback.selectMenu") : t("layouts.summary.noSelect");
      }
      const names = block.buttons
        .map((id) => library.buttons.find((b) => b.id === id))
        .map((b) => (b ? buttonName(b, t("builder.fallback.button")) : t("layouts.actions.missingButton")));
      return names.length ? names.join(" · ") : t("layouts.summary.noButtons");
    }
    case "container":
      return t("layouts.summary.blocks", { count: block.children.length });
    default:
      return "";
  }
}

export function metaOf(block: Block): KindMeta {
  return KIND_META[blockKindOf(block)];
}
