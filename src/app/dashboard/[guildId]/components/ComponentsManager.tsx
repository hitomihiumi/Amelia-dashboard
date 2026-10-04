"use client";

import { ConfirmIconButton } from "@/components/dashboard/ConfirmIconButton";
import { DiscordPreview } from "@/components/dashboard/discord/preview/DiscordPreview";
import { LayoutPreviewSelectionProvider } from "@/components/dashboard/discord/preview/layoutPreviewContext";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import type { Translator } from "@/i18n/translate";
import { generateID } from "@/lib/db/generateID";
import type {
  ButtonCustom,
  EmbedCustom,
  LayoutCustom,
  ModalCustom,
  ScenarioCustom,
  SelectMenuCustom,
} from "@/lib/db/types";
import { LAYOUT_LIMITS, countLayoutComponents } from "@/lib/db/types";
import { copyLayout } from "@/lib/layouts/blocks";
import type { GuildChannelOption } from "@/lib/discord/channels-api";
import type { DiscordRole } from "@/lib/discord/role-style";
import type { GuildActionState } from "@/types/dashboard";
import {
  Button,
  Column,
  Feedback,
  Grid,
  Icon,
  IconButton,
  RevealFx,
  Row,
  SegmentedControl,
  Tag,
  Text,
  useToast,
} from "@once-ui-system/core";
import { useRouter } from "next/navigation";
import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { BUTTON_STYLE_LABEL_KEY, ButtonEditor } from "./ButtonEditor";
import styles from "./ComponentsManager.module.scss";
import { EmbedEditor } from "./EmbedEditor";
import { ModalEditor } from "./ModalEditor";
import { SelectMenuEditor } from "./SelectMenuEditor";
import { PreviewEmpty, PreviewPane, Workspace, WorkspaceCard } from "./Workspace";
import { updateComponents } from "./actions";
import { BudgetBar } from "./layouts/BudgetBar";
import { LayoutEditor, type LayoutSelection } from "./layouts/LayoutEditor";
import {
  COMPONENT_ID_TYPE,
  type ComponentsState,
  type ComponentsTab,
  DEFAULT_FACTORIES,
} from "./componentsTypes";

type TabValue = ComponentsTab;

/** `Row as="button"` does not type `type`, but the element still needs it (never a submit button). */
const NATIVE_BUTTON = { type: "button" } as const;

const TAB_LABEL_KEYS: Record<TabValue, MessageKey> = {
  buttons: "builder.components.tabs.buttons",
  modals: "builder.components.tabs.modals",
  embed: "builder.components.tabs.embed",
  selectMenus: "builder.components.tabs.selectMenus",
  layouts: "layouts.tab.label",
};

const NEW_ITEM_KEYS: Record<TabValue, MessageKey> = {
  buttons: "builder.components.newItem.buttons",
  modals: "builder.components.newItem.modals",
  embed: "builder.components.newItem.embed",
  selectMenus: "builder.components.newItem.selectMenus",
  layouts: "layouts.tab.newItem",
};

const EMPTY_TEXT_KEYS: Record<TabValue, MessageKey> = {
  buttons: "builder.components.emptyText.buttons",
  modals: "builder.components.emptyText.modals",
  embed: "builder.components.emptyText.embed",
  selectMenus: "builder.components.emptyText.selectMenus",
  layouts: "layouts.tab.emptyText",
};

export interface ComponentsManagerProps {
  guildId: string;
  initialState: ComponentsState;
  roles: DiscordRole[];
  channels: GuildChannelOption[];
  scenarios: ScenarioCustom[];
  /** Tab to open first, e.g. from a `?tab=layouts` link. */
  initialTab?: ComponentsTab | null;
}

export function ComponentsManager({
  guildId,
  initialState,
  roles,
  channels,
  scenarios,
  initialTab,
}: ComponentsManagerProps) {
  // roles/channels reserved for future restrictions UI on components (currently unused here).
  void roles;
  void channels;
  const t = useT();
  const router = useRouter();
  const { addToast } = useToast();
  const { setIsDirty, setSaveAction, setCancelAction } = useUnsavedChanges();

  const [state, setState] = useState<ComponentsState>(initialState);
  const [baseline, setBaseline] = useState<ComponentsState>(initialState);
  const [tab, setTab] = useState<TabValue>(initialTab ?? "buttons");
  // Edit/create are tracked by id so the editor and preview always resolve a
  // live item from `state` (no more out-of-bounds indices).
  const [editing, setEditing] = useState<{ kind: TabValue; id: string } | null>(null);

  const itemsByTab: Record<TabValue, AnyComponent[]> = useMemo(
    () => ({
      buttons: state.buttons,
      modals: state.modals,
      embed: state.embed,
      selectMenus: state.selectMenus,
      layouts: state.layouts,
    }),
    [state],
  );

  // Which scenarios reference each component id, so deleting one can be flagged
  // before it silently breaks a scenario (only otherwise caught at scenario-save time).
  const usageByComponentId = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const s of scenarios) {
      const ids = new Set<string>();
      if (s.trigger?.componentId) ids.add(s.trigger.componentId);
      for (const step of s.steps) {
        const a = step.action;
        const refs = [
          a.modalId,
          a.embedId,
          a.dmEmbedId,
          ...(a.embeds ?? []),
          ...(a.buttons ?? []),
          ...(a.selectMenus ?? []),
          a.layoutId,
        ];
        for (const id of refs) {
          if (id) ids.add(id);
        }
      }
      for (const id of ids) map.set(id, [...(map.get(id) ?? []), s.name]);
    }
    return map;
  }, [scenarios]);

  const sameAsBaseline = useMemo(
    () => JSON.stringify(state) === JSON.stringify(baseline),
    [state, baseline],
  );

  useEffect(() => {
    setIsDirty(!sameAsBaseline);
  }, [sameAsBaseline, setIsDirty]);

  const handleSave = useCallback(async () => {
    const fd = new FormData();
    fd.set("components", JSON.stringify(state));
    const result: GuildActionState = await updateComponents(guildId, fd);
    if (result?.ok) {
      setBaseline(state);
      router.refresh();
      addToast({ variant: "success", message: t("builder.components.saved") });
    } else {
      addToast({ variant: "danger", message: result?.error ?? t("builder.components.saveFailed") });
    }
  }, [guildId, state, router, addToast, t]);

  const handleCancel = useCallback(() => {
    setState(baseline);
    setEditing(null);
  }, [baseline]);

  useEffect(() => {
    setSaveAction(handleSave);
    setCancelAction(handleCancel);
    return () => {
      setSaveAction(null);
      setCancelAction(null);
    };
  }, [handleSave, handleCancel, setSaveAction, setCancelAction]);

  useEffect(() => {
    return () => setIsDirty(false);
  }, [setIsDirty]);

  const startCreate = (kind: TabValue) => {
    if (kind === "layouts" && state.layouts.length >= LAYOUT_LIMITS.MAX_LAYOUTS_PER_GUILD) {
      addToast({
        variant: "danger",
        message: t("layouts.tab.limitReached", { max: LAYOUT_LIMITS.MAX_LAYOUTS_PER_GUILD }),
      });
      return;
    }
    const id = generateID(guildId, COMPONENT_ID_TYPE[kind]);
    const item = DEFAULT_FACTORIES[kind](id, t);
    // Seed the new item into state immediately so the editor + preview see it.
    setState(
      (prev) =>
        ({
          ...prev,
          [kind]: [...listOf(prev, kind), item],
        }) as ComponentsState,
    );
    setEditing({ kind, id });
  };

  const toggleEdit = (kind: TabValue, id: string) =>
    setEditing((cur) => (cur?.kind === kind && cur.id === id ? null : { kind, id }));

  const updateItemById = useCallback(
    <K extends TabValue>(kind: K, id: string, next: ComponentsState[K][number]) => {
      setState((prev) => ({
        ...prev,
        [kind]: listOf(prev, kind).map((it) => (it.id === id ? next : it)) as ComponentsState[K],
      }));
    },
    [],
  );

  const deleteItemById = useCallback((kind: TabValue, id: string) => {
    setState(
      (prev) =>
        ({
          ...prev,
          [kind]: listOf(prev, kind).filter((it) => it.id !== id),
        }) as ComponentsState,
    );
    setEditing((cur) => (cur?.id === id ? null : cur));
  }, []);

  const duplicateItemById = useCallback(
    (kind: TabValue, id: string) => {
      setState((prev) => {
        const list = listOf(prev, kind);
        const original = list.find((it) => it.id === id);
        if (!original) return prev;
        if (kind === "layouts" && list.length >= LAYOUT_LIMITS.MAX_LAYOUTS_PER_GUILD) return prev;
        const newId = generateID(guildId, COMPONENT_ID_TYPE[kind]);
        if (kind === "layouts") {
          const source = original as LayoutCustom;
          const name = t("builder.shared.copyName", { name: source.name || t("layouts.fallbackName") });
          return { ...prev, layouts: [...prev.layouts, copyLayout(source, newId, name)] };
        }
        const copy = {
          ...JSON.parse(JSON.stringify(original)),
          id: newId,
        } as ComponentsState[typeof kind][number];
        // Stamp a friendly "copy" display name where the type has one.
        const o = original as { name?: string; label?: string; title?: string };
        const c = copy as { name?: string; label?: string; title?: string };
        const copyName = (name: string) => t("builder.shared.copyName", { name });
        if (kind === "buttons") c.name = copyName(o.name || o.label || t("builder.fallback.button"));
        else if (kind === "modals") c.title = copyName(o.title || t("builder.fallback.modal"));
        else if (kind === "embed") c.name = copyName(o.name || t("builder.fallback.embed"));
        else if (kind === "selectMenus")
          c.name = copyName(o.name || t("builder.fallback.selectMenu"));
        return { ...prev, [kind]: [...list, copy] } as ComponentsState;
      });
    },
    [guildId, t],
  );

  // Resolve the live item currently being edited (by id), for editor + preview.
  const liveItem = useMemo(() => {
    if (!editing) return null;
    const list = listOf(state, editing.kind);
    return list.find((it) => it.id === editing.id) ?? null;
  }, [editing, state]);

  const previewMsg = useMemo(() => {
    if (!editing || !liveItem) return null;
    return previewForItem(editing.kind, liveItem, t, {
      buttons: state.buttons,
      selectMenus: state.selectMenus,
    });
  }, [editing, liveItem, t, state.buttons, state.selectMenus]);

  // Stable between keystrokes of other tabs, so the layout editor does not re-validate for nothing.
  const library = useMemo(
    () => ({ buttons: state.buttons, selectMenus: state.selectMenus }),
    [state.buttons, state.selectMenus],
  );

  // The preview may lag a frame behind the keyboard: typing in the editor comes first.
  const deferredPreviewMsg = useDeferredValue(previewMsg);

  // ---- layouts: block selection shared by the editor and the preview ----
  const [layoutSelection, setLayoutSelection] = useState<LayoutSelection | null>(null);
  const previewPaneRef = useRef<HTMLDivElement>(null);
  const layoutEditing = editing?.kind === "layouts" ? (liveItem as LayoutCustom | null) : null;

  const selectFromEditor = useCallback((blockId: string) => {
    setLayoutSelection((cur) => ({ blockId, source: "editor", nonce: (cur?.nonce ?? 0) + 1 }));
  }, []);
  const selectFromPreview = useCallback((blockId: string) => {
    setLayoutSelection((cur) => ({ blockId, source: "preview", nonce: (cur?.nonce ?? 0) + 1 }));
  }, []);
  const previewSelection = useMemo(
    () => ({ selectedId: layoutSelection?.blockId ?? null, onSelect: selectFromPreview }),
    [layoutSelection?.blockId, selectFromPreview],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: a new layout starts without a selection
  useEffect(() => {
    setLayoutSelection(null);
  }, [editing?.id]);

  // Keep the block picked in the editor visible inside the (scrollable) preview pane.
  useEffect(() => {
    if (!layoutSelection || layoutSelection.source !== "editor") return;
    const pane = previewPaneRef.current;
    const el = pane?.querySelector<HTMLElement>(`[data-layout-block="${layoutSelection.blockId}"]`);
    if (!pane || !el) return;
    const paneBox = pane.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    if (box.top < paneBox.top) pane.scrollTop -= paneBox.top - box.top + 8;
    else if (box.bottom > paneBox.bottom) pane.scrollTop += box.bottom - paneBox.bottom + 8;
  }, [layoutSelection]);

  // Keep the item that was just opened or created in view (a new one lands at the end of the list).
  // biome-ignore lint/correctness/useExhaustiveDependencies: only the opened item matters
  useEffect(() => {
    if (!editing) return;
    const raf = requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-item-id="${editing.id}"]`);
      if (!el) return;
      // Only when the card's head is off screen (a new item lands at the end of the list).
      const top = el.getBoundingClientRect().top;
      if (top < 0 || top > window.innerHeight - 160) el.scrollIntoView({ block: "start", behavior: "smooth" });
    });
    return () => cancelAnimationFrame(raf);
  }, [editing?.id]);

  // The tab strip scrolls on phones: keep the chosen tab in view (also when `?tab=` picked it).
  const tabsRef = useRef<HTMLDivElement>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the tab changes
  useEffect(() => {
    tabsRef.current
      ?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [tab]);

  const items = itemsByTab[tab];

  const preview = (
    <PreviewPane
      title={t("builder.workspace.previewTitle")}
      bodyRef={previewPaneRef}
      meta={
        editing && liveItem ? (
          <>
            <Text variant="body-default-s" onBackground="neutral-medium" truncate>
              {componentName(editing.kind, liveItem, t)}
            </Text>
            <Tag label={t(TAB_LABEL_KEYS[editing.kind])} size="s" />
          </>
        ) : undefined
      }
      toolbar={layoutEditing ? <BudgetBar layout={layoutEditing} compact /> : undefined}
    >
      {deferredPreviewMsg ? (
        <LayoutPreviewSelectionProvider value={layoutEditing ? previewSelection : null}>
          <DiscordPreview message={deferredPreviewMsg} />
        </LayoutPreviewSelectionProvider>
      ) : (
        <PreviewEmpty
          title={t("builder.workspace.previewEmptyTitle")}
          text={t("builder.workspace.previewEmptyComponents")}
        />
      )}
    </PreviewPane>
  );

  return (
    <RevealFx delay={300} translateY={-0.5} fillWidth>
      <Workspace aside={preview}>
        <WorkspaceCard>
          <Column fillWidth ref={tabsRef}>
            <SegmentedControl
              fillWidth
              value={tab}
              onChange={(val) => setTab(val as TabValue)}
              buttons={[
                { label: t(TAB_LABEL_KEYS.buttons), value: "buttons" },
                { label: t(TAB_LABEL_KEYS.modals), value: "modals" },
                { label: t(TAB_LABEL_KEYS.embed), value: "embed" },
                { label: t(TAB_LABEL_KEYS.selectMenus), value: "selectMenus" },
                { label: t(TAB_LABEL_KEYS.layouts), value: "layouts" },
              ]}
            />
          </Column>

          <Row
            fillWidth
            horizontal="between"
            vertical="center"
            wrap
            gap="12"
            style={{ columnGap: "var(--static-space-16)" }}
          >
            <Row fitWidth gap="12" minWidth="0" style={{ alignItems: "baseline" }}>
              <Text variant="heading-strong-s">{t(TAB_LABEL_KEYS[tab])}</Text>
              <Text variant="body-default-s" onBackground="neutral-weak">
                {items.length}
              </Text>
            </Row>
            <Button prefixIcon="plus" onClick={() => startCreate(tab)}>
              {t(NEW_ITEM_KEYS[tab])}
            </Button>
          </Row>

          {items.length === 0 ? (
            <Feedback
              variant="info"
              title={t("builder.components.emptyTitle")}
              description={t(EMPTY_TEXT_KEYS[tab])}
            />
          ) : (
            <Grid
              fillWidth
              gap="12"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 280px), 1fr))",
                alignItems: "start",
              }}
            >
              {items.map((item) => (
                <ComponentItem
                  key={item.id}
                  tab={tab}
                  item={item}
                  name={componentName(tab, item, t)}
                  subtitle={componentSubtitle(tab, item, t)}
                  usageNames={usageByComponentId.get(item.id)}
                  guildId={guildId}
                  library={library}
                  layoutSelection={layoutSelection}
                  onLayoutSelect={selectFromEditor}
                  onGotoTab={setTab}
                  open={editing?.kind === tab && editing.id === item.id}
                  onToggle={() => toggleEdit(tab, item.id)}
                  onChange={(next) => updateItemById(tab, item.id, next)}
                  onDelete={() => deleteItemById(tab, item.id)}
                  onDuplicate={() => duplicateItemById(tab, item.id)}
                  onMove={(direction) => {
                    const list = listOf(state, tab);
                    const index = list.findIndex((it) => it.id === item.id);
                    if (index < 0) return;
                    const newIndex = index + direction;
                    if (newIndex < 0 || newIndex >= list.length) return;
                    const reordered = [...list];
                    const [moved] = reordered.splice(index, 1);
                    reordered.splice(newIndex, 0, moved);
                    setState((prev) => ({ ...prev, [tab]: reordered }) as ComponentsState);
                  }}
                />
              ))}
            </Grid>
          )}
        </WorkspaceCard>
      </Workspace>
    </RevealFx>
  );
}

// ---------------- helpers ----------------

type AnyComponent = ButtonCustom | ModalCustom | EmbedCustom | SelectMenuCustom | LayoutCustom;

/** Type-safe accessor that returns a collection as the union of all component kinds. */
function listOf(state: ComponentsState, kind: TabValue): AnyComponent[] {
  return state[kind] as unknown as AnyComponent[];
}

function tabIcon(tab: TabValue) {
  switch (tab) {
    case "buttons":
      return "buttonIcon" as const;
    case "modals":
      return "modalIcon" as const;
    case "embed":
      return "embedIcon" as const;
    case "selectMenus":
      return "selectIcon" as const;
    case "layouts":
      return "boxes" as const;
  }
}

function componentName(tab: TabValue, item: AnyComponent, t: Translator): string {
  const o = item as { name?: string; label?: string; title?: string; placeholder?: string };
  if (tab === "buttons") return o.name || o.label || t("builder.fallback.button");
  if (tab === "modals") return o.title || t("builder.fallback.modal");
  if (tab === "embed") return o.name || o.title || t("builder.fallback.embed");
  if (tab === "selectMenus") return o.name || o.placeholder || t("builder.fallback.selectMenu");
  if (tab === "layouts") return o.name || t("layouts.fallbackName");
  return t("builder.fallback.item");
}

function componentSubtitle(tab: TabValue, item: AnyComponent, t: Translator): string {
  const o = item as { style?: string; disabled?: boolean; fields?: unknown[]; options?: unknown[] };
  if (tab === "buttons") {
    const style = o.style as ButtonCustom["style"] | undefined;
    const styleLabel = style && style in BUTTON_STYLE_LABEL_KEY ? t(BUTTON_STYLE_LABEL_KEY[style]) : (o.style ?? "");
    return o.disabled
      ? t("builder.components.buttonDisabledSuffix", { style: styleLabel })
      : styleLabel;
  }
  if (tab === "modals" || tab === "embed")
    return t("builder.shared.fieldsCount", { count: o.fields?.length ?? 0 });
  if (tab === "selectMenus")
    return t("builder.shared.optionsCount", { count: o.options?.length ?? 0 });
  if (tab === "layouts") {
    return t("layouts.tab.componentsCount", {
      count: countLayoutComponents(item as LayoutCustom),
      max: LAYOUT_LIMITS.MAX_COMPONENTS,
    });
  }
  return "";
}

// No hardcoded author: the preview resolves the guild's real bot identity from
// DiscordPreviewContext (provided by the guild layout).
function previewForItem(
  tab: TabValue,
  item: AnyComponent,
  t: Translator,
  library: { buttons: ButtonCustom[]; selectMenus: SelectMenuCustom[] },
) {
  const preview = t("builder.scenarios.preview");
  if (tab === "buttons") return { content: preview, buttons: [item as ButtonCustom] };
  if (tab === "embed") return { content: undefined, embeds: [item as EmbedCustom] };
  if (tab === "selectMenus") return { content: preview, selectMenus: [item as SelectMenuCustom] };
  if (tab === "modals") return { modal: item as ModalCustom };
  if (tab === "layouts") return { layout: item as LayoutCustom, layoutLibrary: library };
  return null;
}

function ComponentItem({
  tab,
  item,
  name,
  subtitle,
  usageNames,
  guildId,
  library,
  layoutSelection,
  onLayoutSelect,
  onGotoTab,
  open,
  onToggle,
  onChange,
  onDelete,
  onDuplicate,
  onMove,
}: {
  tab: TabValue;
  item: AnyComponent;
  name: string;
  subtitle?: string;
  usageNames?: string[];
  guildId: string;
  library: { buttons: ButtonCustom[]; selectMenus: SelectMenuCustom[] };
  layoutSelection: LayoutSelection | null;
  onLayoutSelect: (blockId: string) => void;
  onGotoTab: (tab: TabValue) => void;
  open: boolean;
  onToggle: () => void;
  onChange: (next: AnyComponent) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (direction: number) => void;
}) {
  const t = useT();
  const usage = usageNames && usageNames.length > 0 ? usageNames : undefined;

  return (
    <Column
      minWidth="0"
      border={open ? "brand-strong" : "neutral-medium"}
      radius="m"
      background={open ? "surface" : "neutral-alpha-weak"}
      className={styles.item}
      data-open={open}
      data-item-id={item.id}
      // An opened item takes the whole row of the grid.
      style={open ? { gridColumn: "1 / -1" } : undefined}
    >
      <Row
        as="button"
        {...NATIVE_BUTTON}
        fillWidth
        vertical="center"
        gap="12"
        paddingX="16"
        paddingY="12"
        className={styles.itemHead}
        style={{ minHeight: 64 }}
        aria-expanded={open}
        data-item-head
        onClick={onToggle}
      >
        <Row fitWidth padding="8" radius="s" background="neutral-alpha-weak">
          <Icon name={tabIcon(tab)} size="s" onBackground="brand-strong" />
        </Row>
        <Column gap="2" flex="1" minWidth="0" className={styles.itemText}>
          <Text variant="body-strong-s">{name}</Text>
          {subtitle && (
            <Text variant="body-default-s" onBackground="neutral-weak">
              {subtitle}
            </Text>
          )}
          {usage && (
            <Text variant="body-default-xs" onBackground="brand-medium">
              {tab === "layouts"
                ? t("layouts.tab.usedIn", { count: usage.length })
                : t("builder.components.usedIn", { count: usage.length })}
            </Text>
          )}
        </Column>
        <Icon
          name="chevronDown"
          size="s"
          onBackground={open ? "neutral-strong" : "neutral-weak"}
          style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform 0.15s ease" }}
        />
      </Row>
      {open && (
        <Column
          fillWidth
          gap="16"
          paddingTop="8"
          paddingX="16"
          paddingBottom="16"
          minWidth="0"
          className={styles.itemBody}
        >
          <Row fillWidth wrap horizontal="end" gap="8">
            <IconButton
              icon="copy"
              variant="secondary"
              tooltip={t("builder.shared.duplicate")}
              onClick={() => onDuplicate()}
            />
            <IconButton
              icon="chevronUp"
              variant="secondary"
              onClick={() => onMove(-1)}
              tooltip={t("builder.shared.moveUp")}
            />
            <IconButton
              icon="chevronDown"
              variant="secondary"
              onClick={() => onMove(1)}
              tooltip={t("builder.shared.moveDown")}
            />
            {tab === "layouts" ? (
              <ConfirmIconButton
                variant="confirm"
                tooltip={t("builder.components.deleteComponent")}
                onConfirm={onDelete}
                confirmMessage={
                  usage ? t("layouts.tab.deleteUsedConfirm", { count: usage.length }) : undefined
                }
              />
            ) : (
              <IconButton
                icon="trash"
                variant="danger"
                tooltip={t("builder.components.deleteComponent")}
                onClick={onDelete}
              />
            )}
          </Row>
          {tab === "buttons" && (
            <ButtonEditor guildId={guildId} value={item as ButtonCustom} onChange={onChange} />
          )}
          {tab === "modals" && (
            <ModalEditor guildId={guildId} value={item as ModalCustom} onChange={onChange} />
          )}
          {tab === "embed" && (
            <EmbedEditor guildId={guildId} value={item as EmbedCustom} onChange={onChange} />
          )}
          {tab === "selectMenus" && (
            <SelectMenuEditor guildId={guildId} value={item as SelectMenuCustom} onChange={onChange} />
          )}
          {tab === "layouts" && (
            <LayoutEditor
              value={item as LayoutCustom}
              onChange={onChange}
              library={library}
              selection={layoutSelection}
              onSelect={onLayoutSelect}
              onGotoTab={onGotoTab}
            />
          )}
        </Column>
      )}
    </Column>
  );
}
