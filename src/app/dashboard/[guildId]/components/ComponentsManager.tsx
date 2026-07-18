"use client";

import { CommandAccordion } from "@/components/dashboard/CommandAccordion";
import { ConfirmIconButton } from "@/components/dashboard/ConfirmIconButton";
import { DiscordPreview } from "@/components/dashboard/discord/preview/DiscordPreview";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
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
  Row,
  SegmentedControl,
  Text,
  useToast,
} from "@once-ui-system/core";
import { useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ButtonEditor } from "./ButtonEditor";
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

const TAB_LABELS: Record<TabValue, string> = {
  buttons: "Buttons",
  modals: "Modals",
  embed: "Embeds",
  selectMenus: "Select Menus",
};

const SINGULAR: Record<TabValue, string> = {
  buttons: "button",
  modals: "modal",
  embed: "embed",
  selectMenus: "select menu",
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
      addToast({ variant: "success", message: "Components saved" });
    } else {
      addToast({ variant: "danger", message: result?.error ?? "Failed to save components" });
    }
  }, [guildId, state, router, addToast]);

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
    const item = DEFAULT_FACTORIES[kind](id);
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
        if (kind === "buttons") c.name = `${o.name || o.label || "Button"} copy`;
        else if (kind === "modals") c.title = `${o.title || "Modal"} copy`;
        else if (kind === "embed") c.name = `${o.name || "Embed"} copy`;
        else if (kind === "selectMenus") c.name = `${o.name || "Select Menu"} copy`;
        return { ...prev, [kind]: [...list, copy] } as ComponentsState;
      });
    },
    [guildId],
  );

  // Resolve the live item currently being edited (by id), for editor + preview.
  const liveItem = useMemo(() => {
    if (!editing) return null;
    const list = listOf(state, editing.kind);
    return list.find((it) => it.id === editing.id) ?? null;
  }, [editing, state]);

  const previewMsg = useMemo(() => {
    if (!editing || !liveItem) return null;
    return previewForItem(editing.kind, liveItem);
  }, [editing, liveItem]);

  return (
    <Flex
      fillWidth
      direction="row"
      gap="24"
      m={{ direction: "column" }}
      style={{ alignItems: "flex-start" }}
    >
      {/* Workspace */}
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
          selected={tab}
          onToggle={(val) => setTab(val as TabValue)}
          buttons={[
            { label: TAB_LABELS.buttons, value: "buttons" },
            { label: TAB_LABELS.modals, value: "modals" },
            { label: TAB_LABELS.embed, value: "embed" },
            { label: TAB_LABELS.selectMenus, value: "selectMenus" },
          ]}
        />

        <Row fillWidth horizontal="between" vertical="center" gap="16">
          <Row gap="12" center>
            <Text variant="heading-strong-s">{TAB_LABELS[tab]}</Text>
            <Text variant="body-default-s" onBackground="neutral-weak">
              {itemsByTab[tab].length}
            </Text>
          </Row>
          <Button prefixIcon="plus" onClick={() => startCreate(tab)}>
            New {SINGULAR[tab]}
          </Button>
        </Row>

        {itemsByTab[tab].length === 0 ? (
          <Feedback
            variant="info"
            title="No items yet"
            description={`Create your first ${SINGULAR[tab]} to see it in the Discord preview.`}
          />
        ) : (
          <Column gap="8" fillWidth>
            {itemsByTab[tab].map((item) => (
              <ComponentItem
                key={item.id}
                tab={tab}
                item={item}
                name={componentName(tab, item)}
                subtitle={componentSubtitle(tab, item)}
                usageNames={usageByComponentId.get(item.id)}
                guildId={guildId}
                open={editing?.kind === tab && editing.id === item.id}
                onToggle={() => toggleEdit(tab, item.id)}
                onChange={(next) => updateItemById(tab, item.id, next)}
                onDelete={() => deleteItemById(tab, item.id)}
                onDuplicate={() => duplicateItemById(tab, item.id)}
              />
            ))}
          </Column>
        )}
      </Flex>

      {/* Preview */}
      <Flex
        direction="column"
        fill
      >
        <Flex fillHeight fillWidth>
          <DiscordPreview message={previewMsg} />
        </Flex>
      </Flex>
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

function componentName(tab: TabValue, item: AnyComponent): string {
  const o = item as { name?: string; label?: string; title?: string; placeholder?: string };
  if (tab === "buttons") return o.name || o.label || "Button";
  if (tab === "modals") return o.title || "Modal";
  if (tab === "embed") return o.name || o.title || "Embed";
  if (tab === "selectMenus") return o.name || o.placeholder || "Select Menu";
  return "Item";
}

function componentSubtitle(tab: TabValue, item: AnyComponent): string {
  const o = item as { style?: string; disabled?: boolean; fields?: unknown[]; options?: unknown[] };
  if (tab === "buttons") return `${o.style ?? ""}${o.disabled ? " • disabled" : ""}`;
  if (tab === "modals") return `${o.fields?.length ?? 0} field(s)`;
  if (tab === "embed") return `${o.fields?.length ?? 0} field(s)`;
  if (tab === "selectMenus") return `${o.options?.length ?? 0} option(s)`;
  return "";
}

// No hardcoded author: the preview resolves the guild's real bot identity from
// DiscordPreviewContext (provided by the guild layout).
function previewForItem(tab: TabValue, item: AnyComponent) {
  if (tab === "buttons") return { content: "Preview", buttons: [item as ButtonCustom] };
  if (tab === "embed") return { content: undefined, embeds: [item as EmbedCustom] };
  if (tab === "selectMenus") return { content: "Preview", selectMenus: [item as SelectMenuCustom] };
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
}) {
  const usage = usageNames && usageNames.length > 0 ? usageNames : undefined;

  return (
    <CommandAccordion
      title={
        <Row fillWidth horizontal="between" vertical="center" gap="8">
          <Text variant="body-strong-s" style={{ wordBreak: "break-word" }}>
            {name}
          </Text>
          <Row gap="4" vertical="center" onClick={(e) => e.stopPropagation()}>
            <IconButton
              icon="copy"
              variant="ghost"
              size="s"
              tooltip="Duplicate"
              onClick={(e: React.SyntheticEvent) => {
                e.stopPropagation();
                onDuplicate();
              }}
            />
            <ConfirmIconButton
              variant={usage ? "confirm" : "immediate"}
              onConfirm={onDelete}
              confirmMessage={
                usage
                  ? `Used in ${usage.length} scenario${usage.length === 1 ? "" : "s"}: ${usage.join(", ")}`
                  : undefined
              }
            />
          </Row>
        </Row>
      }
      subline={
        <Column gap="2">
          {subtitle && <Row>{subtitle}</Row>}
          {usage && (
            <Row onBackground="brand-medium">
              Used in {usage.length} scenario{usage.length === 1 ? "" : "s"}
            </Row>
          )}
        </Column>
      }
      iconName={tabIcon(tab)}
      open={open}
      onToggle={onToggle}
    >
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
