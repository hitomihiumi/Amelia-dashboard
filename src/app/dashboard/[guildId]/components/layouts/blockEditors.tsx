"use client";

import { ColorInput } from "@/components/dashboard/ColorInput";
import { LabelSelect } from "@/components/dashboard/discord/LabelSelect";
import { useT } from "@/i18n/client";
import {
  LAYOUT_LIMITS,
  type LayoutActions,
  type LayoutContainer,
  type LayoutGallery,
  type LayoutGalleryItem,
  type LayoutSection,
  type LayoutSeparator,
  type LayoutText,
} from "@/lib/db/types";
import { resolveDiscordColor } from "@/lib/discord/discord-style";
import { actionsMode } from "@/lib/layouts/blocks";
import {
  Button,
  Column,
  IconButton,
  Input,
  Row,
  SegmentedControl,
  Switch,
  Text,
} from "@once-ui-system/core";
import { useEditorActions, useEditorEnv } from "./editorContext";
import styles from "./LayoutEditor.module.scss";
import { MediaUrlField } from "./MediaUrlField";
import {
  ButtonSwatch,
  NothingStored,
  buttonName,
  useButtonOptions,
  useSelectMenuOptions,
} from "./pickers";
import { TextAreaField } from "./TextAreaField";

/** Problems of one field, e.g. `.items[1]`: whether the block has an issue whose path starts with it. */
export type FieldCheck = (subPath: string) => boolean;

function move<T>(list: T[], from: number, delta: -1 | 1): T[] {
  const to = from + delta;
  if (to < 0 || to >= list.length) return list;
  const next = list.slice();
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

// ==================== TEXT ====================

export function TextBlockEditor({
  block,
  invalid,
  onChange,
}: {
  block: LayoutText;
  invalid: FieldCheck;
  onChange: (next: LayoutText) => void;
}) {
  const t = useT();

  return (
    <Column gap="8" fillWidth>
      <TextAreaField
        id={`${block.id}-content`}
        label={t("layouts.text.label")}
        placeholder={t("layouts.text.placeholder")}
        value={block.content}
        invalid={invalid("")}
        onChange={(content) => onChange({ ...block, content })}
      />
      <Text variant="body-default-xs" onBackground="neutral-weak">
        {t("layouts.text.markdownHint")}
      </Text>
    </Column>
  );
}

// ==================== SEPARATOR ====================

export function SeparatorEditor({
  block,
  onChange,
}: {
  block: LayoutSeparator;
  onChange: (next: LayoutSeparator) => void;
}) {
  const t = useT();

  return (
    <Column gap="12" fillWidth>
      <Switch
        label={t("layouts.separator.divider")}
        description={t("layouts.separator.dividerHint")}
        checked={block.divider}
        onToggle={() => onChange({ ...block, divider: !block.divider })}
      />
      <Column gap="8">
        <Text variant="label-default-s">{t("layouts.separator.spacing")}</Text>
        <SegmentedControl
          fillWidth
          value={block.spacing}
          onChange={(spacing) => onChange({ ...block, spacing: spacing as LayoutSeparator["spacing"] })}
          buttons={[
            { label: t("layouts.separator.small"), value: "small" },
            { label: t("layouts.separator.large"), value: "large" },
          ]}
        />
      </Column>
    </Column>
  );
}

// ==================== GALLERY ====================

export function GalleryEditor({
  block,
  invalid,
  onChange,
}: {
  block: LayoutGallery;
  invalid: FieldCheck;
  onChange: (next: LayoutGallery) => void;
}) {
  const t = useT();
  const { seeds } = useEditorEnv();
  const max = LAYOUT_LIMITS.MAX_GALLERY_ITEMS;

  const setItems = (items: LayoutGalleryItem[]) => onChange({ ...block, items });
  const patch = (i: number, change: Partial<LayoutGalleryItem>) =>
    setItems(block.items.map((item, index) => (index === i ? { ...item, ...change } : item)));

  return (
    <Column gap="12" fillWidth>
      <Row fillWidth horizontal="between" vertical="center" gap="8">
        <Text variant="label-default-s">
          {t("layouts.gallery.items", { count: block.items.length, max })}
        </Text>
        <Button
          size="s"
          variant="secondary"
          prefixIcon="plus"
          disabled={block.items.length >= max}
          onClick={() => setItems([...block.items, { url: seeds.mediaUrl }])}
        >
          {t("layouts.gallery.addItem")}
        </Button>
      </Row>

      {block.items.map((item, i) => (
        <div className={styles.subCard} key={i}>
          <Row fillWidth horizontal="between" vertical="center" gap="8">
            <Text variant="label-strong-s">{t("layouts.gallery.itemTitle", { n: i + 1 })}</Text>
            <Row gap="2">
              <IconButton
                icon="chevronUp"
                size="s"
                variant="ghost"
                tooltip={t("builder.shared.moveUp")}
                disabled={i === 0}
                onClick={() => setItems(move(block.items, i, -1))}
              />
              <IconButton
                icon="chevronDown"
                size="s"
                variant="ghost"
                tooltip={t("builder.shared.moveDown")}
                disabled={i === block.items.length - 1}
                onClick={() => setItems(move(block.items, i, 1))}
              />
              <IconButton
                icon="trash"
                size="s"
                variant="ghost"
                tooltip={t("layouts.gallery.removeItem")}
                onClick={() => setItems(block.items.filter((_, index) => index !== i))}
              />
            </Row>
          </Row>
          <MediaUrlField
            id={`${block.id}-url-${i}`}
            label={t("layouts.media.url")}
            value={item.url}
            invalid={invalid(`.items[${i}]`)}
            onChange={(url) => patch(i, { url })}
          />
          <Input
            id={`${block.id}-desc-${i}`}
            label={t("layouts.media.description")}
            value={item.description ?? ""}
            maxLength={LAYOUT_LIMITS.MAX_MEDIA_DESCRIPTION}
            onChange={(e) => patch(i, { description: e.target.value || undefined })}
          />
          <Switch
            label={t("layouts.media.spoiler")}
            checked={Boolean(item.spoiler)}
            onToggle={() => patch(i, { spoiler: !item.spoiler })}
          />
        </div>
      ))}
    </Column>
  );
}

// ==================== SECTION ====================

export function SectionEditor({
  block,
  invalid,
  onChange,
}: {
  block: LayoutSection;
  invalid: FieldCheck;
  onChange: (next: LayoutSection) => void;
}) {
  const t = useT();
  const { library, used, seeds } = useEditorEnv();
  const actions = useEditorActions();
  const max = LAYOUT_LIMITS.MAX_SECTION_TEXTS;
  const accessory = block.accessory;

  const ownButtonId = accessory.kind === "button" ? accessory.buttonId : "";
  const buttonOptions = useButtonOptions(
    library.buttons,
    (button) => used.buttons.has(button.id) && button.id !== ownButtonId,
  );

  const setTexts = (texts: string[]) => onChange({ ...block, texts });

  const switchAccessory = (kind: string) => {
    if (kind === accessory.kind) return;
    if (kind === "thumbnail") {
      onChange({ ...block, accessory: { kind: "thumbnail", url: seeds.mediaUrl } });
    } else {
      const free = library.buttons.find((button) => !used.buttons.has(button.id));
      onChange({ ...block, accessory: { kind: "button", buttonId: free?.id ?? "" } });
    }
  };

  return (
    <Column gap="16" fillWidth>
      <Column gap="12" fillWidth>
        {block.texts.map((text, i) => (
          <TextAreaField
            key={i}
            id={`${block.id}-text-${i}`}
            label={t("layouts.section.textTitle", { n: i + 1 })}
            placeholder={t("layouts.text.placeholder")}
            value={text}
            invalid={invalid(`.texts[${i}]`)}
            onChange={(value) => setTexts(block.texts.map((old, index) => (index === i ? value : old)))}
            actions={
              block.texts.length > 1 ? (
                <IconButton
                  icon="trash"
                  size="s"
                  variant="ghost"
                  tooltip={t("layouts.section.removeText")}
                  onClick={() => setTexts(block.texts.filter((_, index) => index !== i))}
                />
              ) : undefined
            }
          />
        ))}
        {block.texts.length < max ? (
          <Row>
            <Button
              size="s"
              variant="secondary"
              prefixIcon="plus"
              onClick={() => setTexts([...block.texts, seeds.sectionText])}
            >
              {t("layouts.section.addText", { count: block.texts.length, max })}
            </Button>
          </Row>
        ) : null}
      </Column>

      <Column gap="8" fillWidth>
        <Text variant="label-default-s">{t("layouts.section.accessory")}</Text>
        <SegmentedControl
          fillWidth
          value={accessory.kind}
          onChange={switchAccessory}
          buttons={[
            { label: t("layouts.section.thumbnail"), value: "thumbnail" },
            { label: t("layouts.section.button"), value: "button" },
          ]}
        />

        {accessory.kind === "thumbnail" ? (
          <div className={styles.subCard}>
            <MediaUrlField
              id={`${block.id}-thumb-url`}
              label={t("layouts.media.url")}
              value={accessory.url}
              invalid={invalid(".accessory")}
              onChange={(url) => onChange({ ...block, accessory: { ...accessory, url } })}
            />
            <Input
              id={`${block.id}-thumb-desc`}
              label={t("layouts.media.description")}
              value={accessory.description ?? ""}
              maxLength={LAYOUT_LIMITS.MAX_MEDIA_DESCRIPTION}
              onChange={(e) =>
                onChange({ ...block, accessory: { ...accessory, description: e.target.value || undefined } })
              }
            />
            <Switch
              label={t("layouts.media.spoiler")}
              checked={Boolean(accessory.spoiler)}
              onToggle={() => onChange({ ...block, accessory: { ...accessory, spoiler: !accessory.spoiler } })}
            />
          </div>
        ) : library.buttons.length === 0 ? (
          <NothingStored kind="buttons" onGoto={actions.gotoTab && (() => actions.gotoTab?.("buttons"))} />
        ) : (
          <LabelSelect
            id={`${block.id}-accessory-button`}
            label={t("layouts.section.pickButton")}
            placeholder={t("layouts.section.pickButtonPlaceholder")}
            options={buttonOptions}
            selectedValue={accessory.buttonId}
            setSelectedValue={(value) =>
              onChange({ ...block, accessory: { kind: "button", buttonId: String(value) } })
            }
            error={invalid(".accessory")}
          />
        )}
      </Column>
    </Column>
  );
}

// ==================== ACTIONS ====================

export function ActionsEditor({
  block,
  invalid,
  onChange,
}: {
  block: LayoutActions;
  invalid: FieldCheck;
  onChange: (next: LayoutActions) => void;
}) {
  const t = useT();
  const { library, used } = useEditorEnv();
  const actions = useEditorActions();
  const mode = actionsMode(block);
  const max = LAYOUT_LIMITS.MAX_BUTTONS_PER_ROW;
  const inRow = new Set(block.buttons);

  const addOptions = useButtonOptions(
    library.buttons,
    (button) => used.buttons.has(button.id) && !inRow.has(button.id),
    (button) => inRow.has(button.id),
  );
  const menuOptions = useSelectMenuOptions(
    library.selectMenus,
    (menu) => used.selectMenus.has(menu.id) && menu.id !== block.selectMenuId,
  );

  const switchMode = (next: string) => {
    if (next === mode) return;
    if (next === "select") {
      const free = library.selectMenus.find((menu) => !used.selectMenus.has(menu.id));
      onChange({ ...block, buttons: [], selectMenuId: free?.id ?? "" });
    } else {
      const free = library.buttons.find((button) => !used.buttons.has(button.id));
      onChange({ ...block, buttons: free ? [free.id] : [], selectMenuId: undefined });
    }
  };

  const setButtons = (buttons: string[]) => onChange({ ...block, buttons });

  return (
    <Column gap="12" fillWidth>
      <SegmentedControl
        fillWidth
        value={mode}
        onChange={switchMode}
        buttons={[
          { label: t("layouts.actions.modeButtons"), value: "buttons" },
          { label: t("layouts.actions.modeSelect"), value: "select" },
        ]}
      />

      {mode === "buttons" ? (
        library.buttons.length === 0 ? (
          <NothingStored kind="buttons" onGoto={actions.gotoTab && (() => actions.gotoTab?.("buttons"))} />
        ) : (
          <Column gap="8" fillWidth>
            <Text variant="label-default-s">
              {t("layouts.actions.buttonsCount", { count: block.buttons.length, max })}
            </Text>

            {block.buttons.map((id, i) => {
              const button = library.buttons.find((candidate) => candidate.id === id);
              return (
                <div className={styles.rowItem} key={`${id}-${i}`}>
                  {button ? <ButtonSwatch style={button.style} /> : null}
                  <Text
                    variant="body-default-s"
                    onBackground={button ? "neutral-strong" : "danger-medium"}
                    style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}
                  >
                    {button
                      ? buttonName(button, t("builder.fallback.button"))
                      : t("layouts.actions.missingButton")}
                  </Text>
                  <IconButton
                    icon="chevronUp"
                    size="s"
                    variant="ghost"
                    tooltip={t("builder.shared.moveUp")}
                    disabled={i === 0}
                    onClick={() => setButtons(move(block.buttons, i, -1))}
                  />
                  <IconButton
                    icon="chevronDown"
                    size="s"
                    variant="ghost"
                    tooltip={t("builder.shared.moveDown")}
                    disabled={i === block.buttons.length - 1}
                    onClick={() => setButtons(move(block.buttons, i, 1))}
                  />
                  <IconButton
                    icon="close"
                    size="s"
                    variant="ghost"
                    tooltip={t("layouts.actions.removeButton")}
                    onClick={() => setButtons(block.buttons.filter((_, index) => index !== i))}
                  />
                </div>
              );
            })}

            {block.buttons.length < max ? (
              <LabelSelect
                id={`${block.id}-add-button`}
                label={t("layouts.actions.addButton")}
                placeholder={t("layouts.actions.addButtonPlaceholder")}
                options={addOptions}
                selectedValue=""
                searchable={library.buttons.length > 8}
                setSelectedValue={(value) => {
                  const id = String(value);
                  if (id) setButtons([...block.buttons, id]);
                }}
                error={invalid("")}
                emptyState={t("layouts.actions.noMoreButtons")}
              />
            ) : (
              <Text variant="body-default-xs" onBackground="neutral-weak">
                {t("layouts.actions.rowFull", { max })}
              </Text>
            )}
          </Column>
        )
      ) : library.selectMenus.length === 0 ? (
        <NothingStored
          kind="selectMenus"
          onGoto={actions.gotoTab && (() => actions.gotoTab?.("selectMenus"))}
        />
      ) : (
        <LabelSelect
          id={`${block.id}-select-menu`}
          label={t("layouts.actions.pickSelect")}
          placeholder={t("layouts.actions.pickSelectPlaceholder")}
          options={menuOptions}
          selectedValue={block.selectMenuId ?? ""}
          setSelectedValue={(value) => onChange({ ...block, buttons: [], selectMenuId: String(value) })}
          error={invalid("")}
        />
      )}
    </Column>
  );
}

// ==================== CONTAINER ====================

const ACCENT_PRESETS = [
  "#5865f2",
  "#23a559",
  "#f0b232",
  "#da373c",
  "#eb459e",
  "#1abc9c",
  "#e67e22",
  "#99aab5",
];

/** Container options. Its children are rendered by the block list, below these settings. */
export function ContainerSettings({
  block,
  invalid,
  onChange,
}: {
  block: LayoutContainer;
  invalid: boolean;
  onChange: (next: LayoutContainer) => void;
}) {
  const t = useT();
  const accent =
    block.accentColor === undefined || block.accentColor === null || block.accentColor === ""
      ? ""
      : resolveDiscordColor(block.accentColor);

  return (
    <Column gap="12" fillWidth>
      <ColorInput
        id={`${block.id}-accent`}
        label={t("layouts.container.accent")}
        value={accent}
        presets={ACCENT_PRESETS}
        error={invalid}
        onChange={(e) => onChange({ ...block, accentColor: e.target.value || null })}
      />
      <Switch
        label={t("layouts.container.spoiler")}
        description={t("layouts.container.spoilerHint")}
        checked={Boolean(block.spoiler)}
        onToggle={() => onChange({ ...block, spoiler: !block.spoiler })}
      />
    </Column>
  );
}
