"use client";

import { CommandAccordion } from "@/components/dashboard/CommandAccordion";
import { ConfirmIconButton } from "@/components/dashboard/ConfirmIconButton";
import { DiscordPreview } from "@/components/dashboard/discord/preview/DiscordPreview";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import type { Translator } from "@/i18n/translate";
import { generateID } from "@/lib/db/generateID";
import type {
  ButtonCustom,
  EmbedCustom,
  ModalCustom,
  ScenarioCustom,
  SelectMenuCustom,
} from "@/lib/db/types";
import type { GuildChannelOption } from "@/lib/discord/channels-api";
import type { DiscordRole } from "@/lib/discord/role-style";
import type { GuildActionState } from "@/types/dashboard";
import {
  Button,
  Column,
  Feedback,
  Flex,
  IconButton,
  RevealFx,
  Row,
  SegmentedControl,
  Text,
  useToast,
} from "@once-ui-system/core";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BUTTON_STYLE_LABEL_KEY, ButtonEditor } from "./ButtonEditor";
import { EmbedEditor } from "./EmbedEditor";
import { ModalEditor } from "./ModalEditor";
import { SelectMenuEditor } from "./SelectMenuEditor";
import { updateComponents } from "./actions";
import {
  COMPONENT_ID_TYPE,
  type ComponentsState,
  type ComponentsTab,
  DEFAULT_FACTORIES,
} from "./componentsTypes";

type TabValue = ComponentsTab;

const TAB_LABEL_KEYS: Record<TabValue, MessageKey> = {
  buttons: "builder.components.tabs.buttons",
  modals: "builder.components.tabs.modals",
  embed: "builder.components.tabs.embed",
  selectMenus: "builder.components.tabs.selectMenus",
};

const NEW_ITEM_KEYS: Record<TabValue, MessageKey> = {
  buttons: "builder.components.newItem.buttons",
  modals: "builder.components.newItem.modals",
  embed: "builder.components.newItem.embed",
  selectMenus: "builder.components.newItem.selectMenus",
};

const EMPTY_TEXT_KEYS: Record<TabValue, MessageKey> = {
  buttons: "builder.components.emptyText.buttons",
  modals: "builder.components.emptyText.modals",
  embed: "builder.components.emptyText.embed",
  selectMenus: "builder.components.emptyText.selectMenus",
};

export interface ComponentsManagerProps {
  guildId: string;
  initialState: ComponentsState;
  roles: DiscordRole[];
  channels: GuildChannelOption[];
  scenarios: ScenarioCustom[];
}

export function ComponentsManager({
  guildId,
  initialState,
  roles,
  channels,
  scenarios,
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
  const [tab, setTab] = useState<TabValue>("buttons");
  // Edit/create are tracked by id so the editor and preview always resolve a
  // live item from `state` (no more out-of-bounds indices).
  const [editing, setEditing] = useState<{ kind: TabValue; id: string } | null>(null);

  const itemsByTab: Record<TabValue, AnyComponent[]> = useMemo(
    () => ({
      buttons: state.buttons,
      modals: state.modals,
      embed: state.embed,
      selectMenus: state.selectMenus,
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
        const newId = generateID(guildId, COMPONENT_ID_TYPE[kind]);
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
    return previewForItem(editing.kind, liveItem, t);
  }, [editing, liveItem, t]);

  return (
    <Flex
      fillWidth
      direction="row"
      gap="24"
      m={{ direction: "column" }}
      style={{ alignItems: "flex-start" }}
    >
      {/* Workspace */}
      <RevealFx delay={300} translateY={-0.5}>
        <Flex
          direction="column"
          fillWidth
          gap="16"
          padding="24"
          border="neutral-weak"
          radius="l"
          background="surface"
          style={{ minWidth: 0 }}
        >
          <SegmentedControl
            fillWidth
            value={tab}
            onChange={(val) => setTab(val as TabValue)}
            buttons={[
              { label: t(TAB_LABEL_KEYS.buttons), value: "buttons" },
              { label: t(TAB_LABEL_KEYS.modals), value: "modals" },
              { label: t(TAB_LABEL_KEYS.embed), value: "embed" },
              { label: t(TAB_LABEL_KEYS.selectMenus), value: "selectMenus" },
            ]}
          />

          <Row fillWidth horizontal="between" vertical="center" gap="16">
            <Row gap="12" center>
              <Text variant="heading-strong-s">{t(TAB_LABEL_KEYS[tab])}</Text>
              <Text variant="body-default-s" onBackground="neutral-weak">
                {itemsByTab[tab].length}
              </Text>
            </Row>
            <Button prefixIcon="plus" onClick={() => startCreate(tab)}>
              {t(NEW_ITEM_KEYS[tab])}
            </Button>
          </Row>

          {itemsByTab[tab].length === 0 ? (
            <Feedback
              variant="info"
              title={t("builder.components.emptyTitle")}
              description={t(EMPTY_TEXT_KEYS[tab])}
            />
          ) : (
            <Column gap="8" fillWidth>
              {itemsByTab[tab].map((item) => (
                <ComponentItem
                  key={item.id}
                  tab={tab}
                  item={item}
                  name={componentName(tab, item, t)}
                  subtitle={componentSubtitle(tab, item, t)}
                  usageNames={usageByComponentId.get(item.id)}
                  guildId={guildId}
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
            </Column>
          )}
        </Flex>
      </RevealFx>

      {/* Preview */}
      <RevealFx delay={600} translateY={-0.5}>
        <Flex direction="column" fill>
          <Flex fillHeight fillWidth>
            <DiscordPreview message={previewMsg} />
          </Flex>
        </Flex>
      </RevealFx>
    </Flex>
  );
}

// ---------------- helpers ----------------

type AnyComponent = ButtonCustom | ModalCustom | EmbedCustom | SelectMenuCustom;

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
  }
}

function componentName(tab: TabValue, item: AnyComponent, t: Translator): string {
  const o = item as { name?: string; label?: string; title?: string; placeholder?: string };
  if (tab === "buttons") return o.name || o.label || t("builder.fallback.button");
  if (tab === "modals") return o.title || t("builder.fallback.modal");
  if (tab === "embed") return o.name || o.title || t("builder.fallback.embed");
  if (tab === "selectMenus") return o.name || o.placeholder || t("builder.fallback.selectMenu");
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
  return "";
}

// No hardcoded author: the preview resolves the guild's real bot identity from
// DiscordPreviewContext (provided by the guild layout).
function previewForItem(tab: TabValue, item: AnyComponent, t: Translator) {
  const preview = t("builder.scenarios.preview");
  if (tab === "buttons") return { content: preview, buttons: [item as ButtonCustom] };
  if (tab === "embed") return { content: undefined, embeds: [item as EmbedCustom] };
  if (tab === "selectMenus") return { content: preview, selectMenus: [item as SelectMenuCustom] };
  if (tab === "modals") return { modal: item as ModalCustom };
  return null;
}

function ComponentItem({
  tab,
  item,
  name,
  subtitle,
  usageNames,
  guildId,
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
    <CommandAccordion
      title={
        <Row fillWidth horizontal="between" vertical="center" gap="8">
          <Text variant="body-strong-s" style={{ wordBreak: "break-word" }}>
            {name}
          </Text>
        </Row>
      }
      subline={
        <Column gap="2">
          {subtitle && <Row>{subtitle}</Row>}
          {usage && (
            <Row onBackground="brand-medium">
              {t("builder.components.usedIn", { count: usage.length })}
            </Row>
          )}
        </Column>
      }
      iconName={tabIcon(tab)}
      open={open}
      onToggle={onToggle}
      gap="8"
    >
      <Row gap="4" horizontal="end" vertical="center" onClick={(e) => e.stopPropagation()}>
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
        <IconButton icon="trash" variant="danger" tooltip={t("builder.components.deleteComponent")} onClick={onDelete} />
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
    </CommandAccordion>
  );
}
