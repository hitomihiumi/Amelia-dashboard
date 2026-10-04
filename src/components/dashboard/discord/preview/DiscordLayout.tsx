"use client";

import { useT } from "@/i18n/client";
import {
  type ButtonCustom,
  type LayoutActions,
  type LayoutComponent,
  type LayoutContainer,
  type LayoutContainerChild,
  type LayoutCustom,
  type LayoutLibrary,
  type LayoutSection,
  type SelectMenuCustom,
  isLayoutAccentColor,
} from "@/lib/db/types";
import { resolveDiscordColor } from "@/lib/discord/discord-style";
import { cn } from "@/lib/utils";
import { type ReactNode, useMemo, useState } from "react";
import { DiscordButton } from "./DiscordButton";
import { PreviewGallery, PreviewMedia } from "./DiscordLayoutMedia";
import { DiscordSelectMenu } from "./DiscordSelectMenu";
import { DiscordText } from "./DiscordText";
import { useLayoutPreviewSelection } from "./layoutPreviewContext";

/** What the preview needs of the library: the full buttons and select menus, not just their ids. */
interface PreviewLibrary {
  buttons: Map<string, ButtonCustom>;
  selectMenus: Map<string, SelectMenuCustom>;
}

function toPreviewLibrary(library: LayoutLibrary): PreviewLibrary {
  const full = <T extends { id: string }>(items: T[], key: string) =>
    new Map(items.filter((item) => key in item).map((item) => [item.id, item]));
  return {
    buttons: full(library.buttons, "label") as Map<string, ButtonCustom>,
    selectMenus: full(library.selectMenus, "options") as Map<string, SelectMenuCustom>,
  };
}

/** Stand-in for a button or select menu that was deleted after the layout referenced it. */
function MissingChip({ kind }: { kind: "button" | "select" | "empty" }) {
  const t = useT();
  const label =
    kind === "button"
      ? t("layouts.preview.missingButton")
      : kind === "select"
        ? t("layouts.preview.missingSelect")
        : t("layouts.preview.emptyRow");
  return (
    <span className="inline-flex h-8 items-center rounded-sm border border-dashed border-discord-interactive-muted px-3 text-xs italic text-discord-text-muted">
      {label}
    </span>
  );
}

function ActionsRow({
  block,
  library,
  buttonSize,
}: {
  block: LayoutActions;
  library: PreviewLibrary;
  buttonSize: "sm" | "md";
}) {
  if (block.selectMenuId) {
    const menu = library.selectMenus.get(block.selectMenuId);
    return menu ? <DiscordSelectMenu menu={menu} /> : <MissingChip kind="select" />;
  }

  if (!block.buttons.length) return <MissingChip kind="empty" />;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {block.buttons.map((id, i) => {
        const button = library.buttons.get(id);
        return button ? (
          <DiscordButton key={`${id}-${i}`} button={button} size={buttonSize} />
        ) : (
          <MissingChip key={`${id}-${i}`} kind="button" />
        );
      })}
    </div>
  );
}

function SectionBlock({
  block,
  library,
}: {
  block: LayoutSection;
  library: PreviewLibrary;
}) {
  const accessory = block.accessory;

  return (
    <div className="flex items-start gap-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {block.texts.map((text, i) => (
          <DiscordText key={i} text={text} className="text-discord-text-normal" />
        ))}
      </div>
      {accessory?.kind === "thumbnail" ? (
        <PreviewMedia
          url={accessory.url}
          description={accessory.description}
          spoiler={accessory.spoiler}
          rounded
          fill
          className="size-20 shrink-0"
        />
      ) : accessory?.kind === "button" ? (
        <div className="shrink-0 self-center">
          {library.buttons.get(accessory.buttonId) ? (
            <DiscordButton button={library.buttons.get(accessory.buttonId) as ButtonCustom} size="sm" />
          ) : (
            <MissingChip kind="button" />
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Wraps a block so a click in the preview selects it in the editor, and the selected one is outlined. */
function Selectable({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) {
  const selection = useLayoutPreviewSelection();
  const selected = selection?.selectedId === id;

  return (
    <div
      data-layout-block={id}
      className={cn(
        className,
        selection && "cursor-pointer rounded-md transition-shadow",
        selected && "shadow-[0_0_0_2px_var(--color-discord-brand)]",
      )}
      onClick={
        selection
          ? (e) => {
              e.stopPropagation();
              selection.onSelect(id);
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}

function Separator({ divider, spacing }: { divider: boolean; spacing: "small" | "large" }) {
  return (
    <div className={spacing === "large" ? "py-3" : "py-[4px]"}>
      {divider ? <div className="h-px w-full bg-discord-bg-modifier-hover" /> : <div className="h-px" />}
    </div>
  );
}

function renderChild(
  child: LayoutContainerChild,
  library: PreviewLibrary,
  buttonSize: "sm" | "md",
): ReactNode {
  switch (child.type) {
    case "text":
      return <DiscordText text={child.content} className="text-discord-text-normal" />;
    case "separator":
      return <Separator divider={child.divider} spacing={child.spacing} />;
    case "gallery":
      return <PreviewGallery items={child.items} />;
    case "section":
      return <SectionBlock block={child} library={library} />;
    case "actions":
      return <ActionsRow block={child} library={library} buttonSize={buttonSize} />;
    default:
      return null;
  }
}

function ContainerBlock({
  block,
  library,
  buttonSize,
}: {
  block: LayoutContainer;
  library: PreviewLibrary;
  buttonSize: "sm" | "md";
}) {
  const t = useT();
  const [revealed, setRevealed] = useState(false);
  const hasAccent =
    block.accentColor !== undefined &&
    block.accentColor !== null &&
    block.accentColor !== "" &&
    isLayoutAccentColor(block.accentColor);
  const accent = hasAccent ? resolveDiscordColor(block.accentColor) : null;
  const hidden = Boolean(block.spoiler) && !revealed;

  return (
    <div className="relative overflow-hidden rounded-lg border border-discord-bg-modifier-hover bg-discord-bg-secondary">
      {accent ? (
        <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: accent }} aria-hidden />
      ) : null}
      <div className={cn("flex flex-col gap-2 p-[16px]", accent && "pl-5", hidden && "blur-md")}>
        {block.children.length === 0 ? (
          <span className="text-sm italic text-discord-text-muted">{t("layouts.preview.emptyContainer")}</span>
        ) : (
          block.children.map((child) => (
            <Selectable key={child.id} id={child.id}>
              {renderChild(child, library, buttonSize)}
            </Selectable>
          ))
        )}
      </div>
      {hidden ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          aria-label={t("layouts.preview.revealSpoiler")}
          className="absolute inset-0 flex cursor-pointer items-center justify-center"
        >
          <span className="rounded-full bg-discord-bg-floating/80 px-3 py-[4px] text-xs font-bold uppercase tracking-wide text-discord-header-primary">
            {t("layouts.preview.spoiler")}
          </span>
        </button>
      ) : null}
    </div>
  );
}

/**
 * Renders a Components V2 layout the way Discord shows it: containers with an accent bar,
 * sections with a thumbnail or button, text displays through the markdown renderer, separators,
 * the media mosaic and action rows backed by the stored buttons and select menus.
 */
export function DiscordLayout({
  layout,
  library,
  buttonSize = "md",
}: {
  layout: LayoutCustom;
  library: LayoutLibrary;
  buttonSize?: "sm" | "md";
}) {
  const t = useT();
  const preview = useMemo(() => toPreviewLibrary(library), [library]);
  const components = layout.components as LayoutComponent[];

  if (components.length === 0) {
    return (
      <div className="mt-[4px] text-sm italic text-discord-text-muted">{t("layouts.preview.empty")}</div>
    );
  }

  return (
    <div className="mt-[4px] flex w-full max-w-[520px] flex-col gap-2 text-discord-text-normal">
      {components.map((component) => (
        <Selectable key={component.id} id={component.id}>
          {component.type === "container" ? (
            <ContainerBlock block={component} library={preview} buttonSize={buttonSize} />
          ) : (
            renderChild(component, preview, buttonSize)
          )}
        </Selectable>
      ))}
    </div>
  );
}
