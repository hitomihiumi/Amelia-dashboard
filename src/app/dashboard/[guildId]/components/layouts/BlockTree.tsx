"use client";

import { ConfirmIconButton } from "@/components/dashboard/ConfirmIconButton";
import { useT } from "@/i18n/client";
import type { LayoutIssue } from "@/lib/db/types";
import { resolveDiscordColor } from "@/lib/discord/discord-style";
import { type Block, type ParentId, ROOT } from "@/lib/layouts/blocks";
import { type IssueContext, NO_ISSUES, formatIssue, issueSubPath } from "@/lib/layouts/issues";
import { Column, IconButton, Row, Tag, Text } from "@once-ui-system/core";
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
    <Column
      ref={cardRef}
      id={blockDomId(block.id)}
      data-block-card
      data-selected={selected}
      data-invalid={issues.length > 0}
      data-dragging={dragging}
      minWidth="0"
      border="neutral-medium"
      radius="m"
      background="neutral-alpha-weak"
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
      <Row
        fillWidth
        wrap
        vertical="center"
        gap="4"
        paddingY="8"
        paddingRight="8"
        paddingLeft="4"
        style={{ columnGap: "var(--static-space-8)" }}
      >
        <IconButton
          icon="text"
          type="button"
          size="s"
          variant="ghost"
          className={styles.handle}
          draggable
          aria-label={t("layouts.block.drag")}
          title={t("layouts.block.dragHint")}
          onDragStart={(e: React.DragEvent<HTMLButtonElement>) => actions.dragStart(block.id, cardRef.current, e)}
          onDragEnd={actions.dragEnd}
          onKeyDown={(e: React.KeyboardEvent<HTMLButtonElement>) => {
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              actions.move(block.id, e.key === "ArrowUp" ? -1 : 1);
              requestAnimationFrame(() =>
                document.getElementById(blockDomId(block.id))?.querySelector<HTMLElement>("[data-block-handle]")?.focus(),
              );
            }
          }}
          data-block-handle
          style={{ width: 24, height: 32, minHeight: 32 }}
        >
          <LuGripVertical size={16} aria-hidden />
        </IconButton>

        <Row
          vertical="center"
          gap="8"
          minWidth="0"
          cursor="interactive"
          onClick={() => actions.toggleCollapse(block.id)}
          role="presentation"
          style={{ flex: "1 1 9rem" }}
        >
          <Row
            center
            radius="s"
            background="neutral-alpha-weak"
            onBackground="brand-strong"
            style={{ width: 28, height: 28, flexShrink: 0 }}
          >
            {meta.icon(16)}
          </Row>
          <Column minWidth="0">
            <Text variant="body-strong-s">{t(meta.label)}</Text>
            {collapsed ? (
              <Text variant="body-default-xs" onBackground="neutral-weak" truncate>
                {summarize(block, t, env.library)}
              </Text>
            ) : null}
          </Column>
          {issues.length > 0 ? (
            <Tag scheme="danger" size="s" prefixIcon="danger" label={String(issues.length)} />
          ) : null}
        </Row>

        <Row wrap vertical="center" gap="2" style={{ marginLeft: "auto" }}>
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
        </Row>
      </Row>

      {collapsed ? null : (
        <Column fillWidth gap="12" paddingTop="4" paddingX="12" paddingBottom="12" minWidth="0">
          {issues.length > 0 ? <IssueList issues={issues} context={issueContext} /> : null}

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
              <Column gap="8" paddingLeft="12" marginLeft="4" minWidth="0" className={styles.children}>
                <BlockList
                  parentId={block.id}
                  blocks={block.children}
                  issuesByBlock={issuesByBlock}
                  issueContext={issueContext}
                />
                <Row fillWidth>
                  <AddBlockMenu parentId={block.id} label={t("layouts.add.toContainer")} />
                </Row>
              </Column>
            </>
          )}
        </Column>
      )}
    </Column>
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

  const over = drop?.parentId === parentId && drop.index === visibleCount;

  const indicator = (position: number) =>
    drop && drop.parentId === parentId && drop.index === position ? (
      <Row fillWidth radius="full" solid="accent-strong" pointerEvents="none" className={styles.dropLine} aria-hidden />
    ) : null;

  return (
    <Column fillWidth gap="8" minWidth="0">
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
      <Row
        center
        hide={!(dragId !== null && !(dragContainer && parentId !== ROOT))}
        fillWidth
        radius="s"
        border={over ? "accent-strong" : "neutral-strong"}
        borderStyle="dashed"
        background={over ? "accent-alpha-weak" : undefined}
        onBackground={over ? "accent-strong" : "neutral-weak"}
        style={{ minHeight: 28 }}
        data-active={dragId !== null && !(dragContainer && parentId !== ROOT)}
        data-over={over}
        onDragOver={(e) => actions.dragOverEnd(e, { parentId, visibleCount })}
      >
        <Text variant="label-default-s">{t("layouts.block.dropHere")}</Text>
      </Row>
    </Column>
  );
}

/** The problems of a block (or of the layout), as one alert. */
export function IssueList({
  issues,
  context,
}: {
  issues: readonly LayoutIssue[];
  context: IssueContext;
}) {
  const t = useT();

  return (
    <Column
      as="ul"
      role="alert"
      fillWidth
      gap="4"
      margin="0"
      paddingX="12"
      paddingY="8"
      radius="s"
      background="danger-alpha-weak"
      onBackground="danger-strong"
    >
      {issues.map((issue, i) => (
        <Row as="li" key={`${issue.code}-${i}`} gap="8" vertical="start">
          <LuCircleAlert size={14} aria-hidden style={{ flexShrink: 0, marginTop: 3 }} />
          <Text variant="body-default-s">{formatIssue(t, issue, context)}</Text>
        </Row>
      ))}
    </Column>
  );
}
