"use client";

import { useT } from "@/i18n/client";
import { type LayoutCustom, type LayoutIssue, collectLayoutIssues } from "@/lib/db/types";
import {
  type Block,
  type BlockKind,
  type BlockSeeds,
  type ParentId,
  ROOT,
  createBlock,
  duplicateBlock,
  findBlock,
  insertBlock,
  moveBlockBy,
  moveBlockTo,
  removeBlock,
  updateBlock,
  usedInteractives,
} from "@/lib/layouts/blocks";
import { type IssueContext, formatIssue, groupIssues } from "@/lib/layouts/issues";
import { Button, Column, Input, Row, Text } from "@once-ui-system/core";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LuLayoutTemplate } from "react-icons/lu";
import { AddBlockMenu } from "./AddBlockMenu";
import { BlockList, IssueList } from "./BlockTree";
import { BudgetBar } from "./BudgetBar";
import styles from "./LayoutEditor.module.scss";
import {
  type DropTarget,
  type EditorActions,
  type EditorEnv,
  EditorActionsContext,
  EditorEnvContext,
  type EditorLibrary,
  blockDomId,
} from "./editorContext";

/** Which block the editor and the preview both point at, and who chose it. */
export interface LayoutSelection {
  blockId: string;
  source: "editor" | "preview";
  /** Changes on every choice, so choosing the same block twice still scrolls to it. */
  nonce: number;
}

export interface LayoutEditorProps {
  value: LayoutCustom;
  onChange: (next: LayoutCustom) => void;
  library: EditorLibrary;
  selection: LayoutSelection | null;
  onSelect: (blockId: string) => void;
  /** Shown as a shortcut when there are no stored buttons or select menus to pick from. */
  onGotoTab?: (tab: "buttons" | "selectMenus") => void;
}

const MEDIA_SEED = "{user.avatar}";

function sameDrop(a: DropTarget | null, b: DropTarget | null) {
  return a === b || (a !== null && b !== null && a.parentId === b.parentId && a.index === b.index);
}

/** Visual block editor of one layout: budget, block tree, drag and drop, and inline validation. */
export function LayoutEditor({
  value,
  onChange,
  library,
  selection,
  onSelect,
  onGotoTab,
}: LayoutEditorProps) {
  const t = useT();

  // Callbacks read the latest layout from refs, so the actions object can stay the same forever.
  const valueRef = useRef(value);
  valueRef.current = value;
  const libraryRef = useRef(library);
  libraryRef.current = library;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const tRef = useRef(t);
  tRef.current = t;
  const onGotoTabRef = useRef(onGotoTab);
  onGotoTabRef.current = onGotoTab;

  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragContainer, setDragContainer] = useState(false);
  const [drop, setDrop] = useState<DropTarget | null>(null);
  const dragRef = useRef<string | null>(null);
  const dropRef = useRef<DropTarget | null>(null);
  const pendingFocus = useRef<string | null>(null);

  const setDropTarget = useCallback((next: DropTarget | null) => {
    if (sameDrop(dropRef.current, next)) return;
    dropRef.current = next;
    setDrop(next);
  }, []);

  const commit = useCallback((next: LayoutCustom) => {
    if (next === valueRef.current) return;
    valueRef.current = next;
    onChangeRef.current(next);
  }, []);

  const actions = useMemo<EditorActions>(() => {
    const seeds = (): BlockSeeds => ({
      text: tRef.current("layouts.defaults.text", { token: "{user.mention}" }),
      sectionText: tRef.current("layouts.defaults.sectionText"),
      mediaUrl: MEDIA_SEED,
    });

    return {
      update: (id, next) => commit(updateBlock(valueRef.current, id, next)),

      remove: (id) => {
        commit(removeBlock(valueRef.current, id));
        setCollapsed((prev) => {
          if (!prev.has(id)) return prev;
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      },

      duplicate: (id) => {
        const { layout, newId } = duplicateBlock(valueRef.current, id, seeds());
        commit(layout);
        if (newId) {
          pendingFocus.current = newId;
          onSelectRef.current(newId);
        }
      },

      move: (id, delta) => commit(moveBlockBy(valueRef.current, id, delta)),

      add: (kind: BlockKind, parentId: ParentId) => {
        const taken = usedInteractives(valueRef.current);
        const lib = libraryRef.current;
        const block = createBlock(kind, seeds(), {
          buttonId: lib.buttons.find((b) => !taken.buttons.has(b.id))?.id,
          selectMenuId: lib.selectMenus.find((m) => !taken.selectMenus.has(m.id))?.id,
        });
        commit(insertBlock(valueRef.current, block, parentId));
        pendingFocus.current = block.id;
        onSelectRef.current(block.id);
      },

      toggleCollapse: (id) =>
        setCollapsed((prev) => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }),

      select: (id) => onSelectRef.current(id),

      gotoTab: (tab) => onGotoTabRef.current?.(tab),

      dragStart: (id, card, event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", id);
        if (card) event.dataTransfer.setDragImage(card, 24, 20);
        dragRef.current = id;
        const found = findBlock(valueRef.current, id);
        // Changing the page while the drag starts can cancel it, so wait a frame.
        requestAnimationFrame(() => {
          setDragContainer(found?.block.type === "container");
          setDragId(dragRef.current);
        });
      },

      dragEnd: () => {
        dragRef.current = null;
        setDragId(null);
        setDragContainer(false);
        setDropTarget(null);
      },

      dragOverCard: (event, target) => {
        const dragged = dragRef.current;
        if (!dragged || target.id === dragged || target.parentId === dragged) return;
        const found = findBlock(valueRef.current, dragged);
        if (!found) return;
        // Containers are top level only.
        if (target.parentId !== ROOT && found.block.type === "container") return;

        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = "move";

        const rect = event.currentTarget.getBoundingClientRect();
        const before = event.clientY < rect.top + rect.height / 2;
        setDropTarget({
          parentId: target.parentId,
          index: before ? target.visibleIndex : target.visibleIndex + 1,
        });
      },

      dragOverEnd: (event, target) => {
        const dragged = dragRef.current;
        if (!dragged || target.parentId === dragged) return;
        const found = findBlock(valueRef.current, dragged);
        if (!found) return;
        if (target.parentId !== ROOT && found.block.type === "container") return;

        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = "move";
        setDropTarget({ parentId: target.parentId, index: target.visibleCount });
      },
    };
  }, [commit, setDropTarget]);

  // ---------- validation ----------

  const issues = useMemo(() => collectLayoutIssues(value, library), [value, library]);
  const grouped = useMemo(() => groupIssues(value, issues), [value, issues]);

  // Blocks only re-render when their own problems change, so the lists keep their identity
  // from one keystroke to the next as long as they say the same thing.
  const stableIssues = useRef<{ map: ReadonlyMap<string, readonly LayoutIssue[]>; keys: Map<string, string> }>({
    map: new Map(),
    keys: new Map(),
  });
  const issuesByBlock = useMemo(() => {
    const prev = stableIssues.current;
    const next = new Map<string, readonly LayoutIssue[]>();
    const keys = new Map<string, string>();
    let same = prev.map.size === grouped.byBlock.size;

    for (const [id, list] of grouped.byBlock) {
      const key = JSON.stringify(list);
      keys.set(id, key);
      const reuse = prev.keys.get(id) === key ? prev.map.get(id) : undefined;
      next.set(id, reuse ?? list);
      if (!reuse) same = false;
    }

    if (same) return prev.map;
    stableIssues.current = { map: next, keys };
    return next;
  }, [grouped]);
  const issueContext = useMemo<IssueContext>(
    () => ({
      nameOf: (id) => {
        const button = library.buttons.find((b) => b.id === id);
        if (button) return button.name || button.label;
        const menu = library.selectMenus.find((m) => m.id === id);
        return menu ? menu.name || menu.placeholder : undefined;
      },
    }),
    [library],
  );

  const layoutIssues = grouped.layout.filter(
    (issue) => !(issue.code === "empty" && value.components.length === 0),
  );
  const nameInvalid = grouped.layout.some((issue) => issue.code === "nameLength");

  // ---------- environment for the blocks ----------

  const usedNow = usedInteractives(value);
  const usedKey = `${[...usedNow.buttons].sort().join(",")}|${[...usedNow.selectMenus].sort().join(",")}`;
  // biome-ignore lint/correctness/useExhaustiveDependencies: `usedKey` is the content of `usedNow`
  const used = useMemo(() => usedNow, [usedKey]);

  const seeds = useMemo<BlockSeeds>(
    () => ({
      text: t("layouts.defaults.text", { token: "{user.mention}" }),
      sectionText: t("layouts.defaults.sectionText"),
      mediaUrl: MEDIA_SEED,
    }),
    [t],
  );

  const env = useMemo<EditorEnv>(
    () => ({
      library,
      used,
      seeds,
      collapsed,
      selectedId: selection?.blockId ?? null,
      dragId,
      dragContainer,
      drop,
    }),
    [library, used, seeds, collapsed, selection?.blockId, dragId, dragContainer, drop],
  );

  // ---------- focus and scroll ----------

  // A block that was just added or duplicated: bring it into view and focus its first field.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs after every layout change on purpose
  useEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    const el = document.getElementById(blockDomId(id));
    if (!el) return;
    pendingFocus.current = null;
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    el.querySelector<HTMLElement>("textarea, input")?.focus({ preventScroll: true });
  }, [value]);

  // A block picked in the preview: open it (and its container) and scroll to it.
  useEffect(() => {
    if (!selection || selection.source !== "preview") return;
    const found = findBlock(valueRef.current, selection.blockId);
    if (!found) return;

    setCollapsed((prev) => {
      const next = new Set(prev);
      next.delete(selection.blockId);
      if (found.parentId) next.delete(found.parentId);
      return next.size === prev.size ? prev : next;
    });

    const raf = requestAnimationFrame(() =>
      document
        .getElementById(blockDomId(selection.blockId))
        ?.scrollIntoView({ block: "center", behavior: "smooth" }),
    );
    return () => cancelAnimationFrame(raf);
  }, [selection]);

  const collapseAll = () =>
    setCollapsed(new Set(value.components.flatMap((c) => (c.type === "container" ? [c.id, ...c.children.map((x) => x.id)] : [c.id]))));
  const expandAll = () => setCollapsed(new Set());

  const commitDrop = (event: React.DragEvent) => {
    const dragged = dragRef.current;
    const target = dropRef.current;
    if (!dragged || !target) return;
    event.preventDefault();
    commit(moveBlockTo(valueRef.current, dragged, target.parentId, target.index));
    dragRef.current = null;
    setDragId(null);
    setDragContainer(false);
    setDropTarget(null);
  };

  const blockCount = value.components.length;

  return (
    <EditorActionsContext.Provider value={actions}>
      <EditorEnvContext.Provider value={env}>
        <Column
          fillWidth
          gap="16"
          className={styles.editor}
          onDrop={commitDrop}
          onDragOver={(e) => {
            // The gaps between blocks keep the last valid drop target.
            if (dragRef.current && dropRef.current) e.preventDefault();
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDropTarget(null);
          }}
        >
          <Input
            id={`layout-name-${value.id}`}
            label={t("layouts.nameLabel")}
            value={value.name}
            maxLength={80}
            error={nameInvalid}
            onChange={(e) => commit({ ...valueRef.current, name: e.target.value })}
          />

          <BudgetBar layout={value} issueCount={issues.length} />

          {layoutIssues.length > 0 ? <IssueList issues={layoutIssues} context={issueContext} /> : null}

          {blockCount === 0 ? (
            <Column
              fillWidth
              horizontal="center"
              gap="12"
              paddingX="16"
              paddingY="24"
              border="neutral-strong"
              borderStyle="dashed"
              radius="m"
            >
              <LuLayoutTemplate size={28} aria-hidden />
              <Text variant="body-strong-m" align="center">
                {t("layouts.empty.title")}
              </Text>
              <Text
                variant="body-default-s"
                onBackground="neutral-weak"
                align="center"
                style={{ maxWidth: 360 }}
              >
                {t("layouts.empty.text")}
              </Text>
              <AddBlockMenu parentId={ROOT} variant="primary" label={t("layouts.empty.add")} />
            </Column>
          ) : (
            <>
              <Row fillWidth horizontal="between" vertical="center" gap="8" wrap>
                <AddBlockMenu parentId={ROOT} />
                <Row gap="4">
                  <Button size="s" variant="tertiary" onClick={expandAll}>
                    {t("layouts.block.expandAll")}
                  </Button>
                  <Button size="s" variant="tertiary" onClick={collapseAll}>
                    {t("layouts.block.collapseAll")}
                  </Button>
                </Row>
              </Row>
              <BlockList
                parentId={ROOT}
                blocks={value.components as Block[]}
                issuesByBlock={issuesByBlock}
                issueContext={issueContext}
              />
            </>
          )}
        </Column>
      </EditorEnvContext.Provider>
    </EditorActionsContext.Provider>
  );
}
