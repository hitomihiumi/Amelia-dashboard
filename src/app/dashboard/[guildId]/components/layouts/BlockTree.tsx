"use client";

import { ConfirmIconButton } from "@/components/dashboard/ConfirmIconButton";
import { useT } from "@/i18n/client";
import type { LayoutIssue } from "@/lib/db/types";
import { resolveDiscordColor } from "@/lib/discord/discord-style";
import { type Block, type ParentId, ROOT } from "@/lib/layouts/blocks";
import { type IssueContext, NO_ISSUES, formatIssue, issueSubPath } from "@/lib/layouts/issues";
import { IconButton, Text } from "@once-ui-system/core";
import { Fragment, memo, useMemo, useRef } from "react";
import { LuChevronDown, LuCircleAlert, LuGripVertical } from "react-icons/lu";
import { AddBlockMenu } from "./AddBlockMenu";
import styles from "./LayoutEditor.module.scss";
import {
  ActionsEditor,
  ContainerSettings,
  type FieldCheck,
  GalleryEditor,
  SectionEditor,
  SeparatorEditor,
  TextBlockEditor,
} from "./blockEditors";
import { metaOf, summarize } from "./blockMeta";
import { blockDomId, useEditorActions, useEditorEnv } from "./editorContext";

type IssuesByBlock = ReadonlyMap<string, readonly LayoutIssue[]>;

interface BlockCardProps {
  block: Block;
  parentId: ParentId;
  /** Position among all siblings. */
  index: number;
  siblingCount: number;
  /** Position among the siblings that are not being dragged right now. */
  visibleIndex: number;
  issues: readonly LayoutIssue[];
  issuesByBlock: IssuesByBlock;
  issueContext: IssueContext;
}

/** One block: header with move/duplicate/delete controls, then its editor and its problems. */
const BlockCard = memo(function BlockCard({
  block,
  parentId,
  index,
  siblingCount,
  visibleIndex,
  issues,
  issuesByBlock,
  issueContext,
}: BlockCardProps) {
  const t = useT();
  const actions = useEditorActions();
  const env = useEditorEnv();
  const cardRef = useRef<HTMLDivElement>(null);

  const collapsed = env.collapsed.has(block.id);
  const selected = env.selectedId === block.id;
  const dragging = env.dragId === block.id;
  const meta = metaOf(block);

  const invalid: FieldCheck = (sub) =>
    issues.some((issue) => {
      const own = issueSubPath(issue);
      return sub === "" ? own === "" || own.startsWith(".buttons") : own === sub;
    });

  const onChange = (next: Block) => actions.update(block.id, next);

  const accent =
    block.type === "container" && block.accentColor !== undefined && block.accentColor !== null && block.accentColor !== ""
      ? resolveDiscordColor(block.accentColor)
      : undefined;

  const childCount = block.type === "container" ? block.children.length : 0;

  return (
    <div
      ref={cardRef}
      id={blockDomId(block.id)}
      data-block-card
      data-selected={selected}
      data-invalid={issues.length > 0}
      data-dragging={dragging}
      className={`${styles.card} ${block.type === "container" ? styles.containerCard : ""}`}
      style={accent ? ({ "--layout-accent": accent } as React.CSSProperties) : undefined}
      onFocus={(e) => {
        // Only the innermost card claims the focus, not the container around it.
        if (!selected && (e.target as HTMLElement).closest("[data-block-card]") === e.currentTarget) {
          actions.select(block.id);
        }
      }}
      onDragOver={(e) => actions.dragOverCard(e, { id: block.id, parentId, visibleIndex })}
    >
      <div className={styles.header}>
        <button
          type="button"
          className={styles.handle}
          draggable
          aria-label={t("layouts.block.drag")}
          title={t("layouts.block.dragHint")}
          onDragStart={(e) => actions.dragStart(block.id, cardRef.current, e)}
          onDragEnd={actions.dragEnd}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              actions.move(block.id, e.key === "ArrowUp" ? -1 : 1);
              requestAnimationFrame(() =>
                document.getElementById(blockDomId(block.id))?.querySelector<HTMLElement>("[data-block-handle]")?.focus(),
              );
            }
          }}
          data-block-handle
        >
          <LuGripVertical size={16} aria-hidden />
        </button>

        <div
          className={styles.title}
          onClick={() => actions.toggleCollapse(block.id)}
          role="presentation"
        >
          <span className={styles.blockIcon}>{meta.icon(16)}</span>
          <span className={styles.titleText}>
            <Text variant="body-strong-s">{t(meta.label)}</Text>
            {collapsed ? (
              <Text variant="body-default-xs" onBackground="neutral-weak" className={styles.summary}>
                {summarize(block, t, env.library)}
              </Text>
            ) : null}
          </span>
          {issues.length > 0 ? (
            <span className={styles.badge}>
              <LuCircleAlert size={12} aria-hidden />
              {issues.length}
            </span>
          ) : null}
        </div>

        <div className={styles.controls}>
          <IconButton
            icon="chevronUp"
            size="s"
            variant="ghost"
            tooltip={t("builder.shared.moveUp")}
            disabled={index === 0}
            onClick={() => actions.move(block.id, -1)}
          />
          <IconButton
            icon="chevronDown"
            size="s"
            variant="ghost"
            tooltip={t("builder.shared.moveDown")}
            disabled={index === siblingCount - 1}
            onClick={() => actions.move(block.id, 1)}
          />
          <IconButton
            icon="copy"
            size="s"
            variant="ghost"
            tooltip={t("builder.shared.duplicate")}
            onClick={() => actions.duplicate(block.id)}
          />
          <ConfirmIconButton
            variant="confirm"
            tooltip={t("layouts.block.delete")}
            onConfirm={() => actions.remove(block.id)}
            confirmMessage={
              childCount > 0 ? t("layouts.block.deleteContainerConfirm", { count: childCount }) : undefined
            }
          />
          <IconButton
            icon="chevronDown"
            size="s"
            variant="ghost"
            tooltip={collapsed ? t("layouts.block.expand") : t("layouts.block.collapse")}
            aria-expanded={!collapsed}
            onClick={() => actions.toggleCollapse(block.id)}
            style={{ transform: collapsed ? undefined : "rotate(180deg)" }}
          >
            <LuChevronDown size={16} aria-hidden />
          </IconButton>
        </div>
      </div>

      {collapsed ? null : (
        <div className={styles.body}>
          {issues.length > 0 ? (
            <ul className={styles.issues} role="alert">
              {issues.map((issue, i) => (
                <li key={`${issue.code}-${i}`}>
                  <LuCircleAlert size={14} aria-hidden />
                  <span>{formatIssue(t, issue, issueContext)}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {block.type === "text" && <TextBlockEditor block={block} invalid={invalid} onChange={onChange} />}
          {block.type === "separator" && <SeparatorEditor block={block} onChange={onChange} />}
          {block.type === "gallery" && <GalleryEditor block={block} invalid={invalid} onChange={onChange} />}
          {block.type === "section" && <SectionEditor block={block} invalid={invalid} onChange={onChange} />}
          {block.type === "actions" && <ActionsEditor block={block} invalid={invalid} onChange={onChange} />}
          {block.type === "container" && (
            <>
              <ContainerSettings
                block={block}
                invalid={issues.some((issue) => issue.code === "accentColorInvalid")}
                onChange={onChange}
              />
              <div className={styles.children}>
                <BlockList
                  parentId={block.id}
                  blocks={block.children}
                  issuesByBlock={issuesByBlock}
                  issueContext={issueContext}
                />
                <div>
                  <AddBlockMenu parentId={block.id} label={t("layouts.add.toContainer")} />
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
});

/** The blocks under one parent (the root of the layout or a container), with drop indicators between them. */
export function BlockList({
  parentId,
  blocks,
  issuesByBlock,
  issueContext,
}: {
  parentId: ParentId;
  blocks: readonly Block[];
  issuesByBlock: IssuesByBlock;
  issueContext: IssueContext;
}) {
  const t = useT();
  const actions = useEditorActions();
  const { dragId, dragContainer, drop } = useEditorEnv();

  const rows = useMemo(() => {
    let visible = 0;
    return blocks.map((block) => {
      const isDragged = block.id === dragId;
      const visibleIndex = visible;
      if (!isDragged) visible += 1;
      return { block, visibleIndex };
    });
  }, [blocks, dragId]);
  const visibleCount = rows.filter((row) => row.block.id !== dragId).length;

  const indicator = (position: number) =>
    drop && drop.parentId === parentId && drop.index === position ? (
      <div className={styles.dropLine} aria-hidden />
    ) : null;

  return (
    <div className={styles.list}>
      {rows.map(({ block, visibleIndex }, index) => (
        <Fragment key={block.id}>
          {block.id !== dragId ? indicator(visibleIndex) : null}
          <BlockCard
            block={block}
            parentId={parentId}
            index={index}
            siblingCount={blocks.length}
            visibleIndex={visibleIndex}
            issues={issuesByBlock.get(block.id) ?? NO_ISSUES}
            issuesByBlock={issuesByBlock}
            issueContext={issueContext}
          />
        </Fragment>
      ))}
      {indicator(visibleCount)}
      <div
        className={styles.dropZone}
        data-active={dragId !== null && !(dragContainer && parentId !== ROOT)}
        data-over={drop?.parentId === parentId && drop.index === visibleCount}
        onDragOver={(e) => actions.dragOverEnd(e, { parentId, visibleCount })}
      >
        {t("layouts.block.dropHere")}
      </div>
    </div>
  );
}
