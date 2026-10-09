"use client";

import { useT } from "@/i18n/client";
import { generateID } from "@/lib/db/generateID";
import type { SelectMenuCustom, SelectMenuOptionCustom } from "@/lib/db/types";
import {
  Accordion,
  Button,
  Column,
  IconButton,
  InlineCode,
  Input,
  NumberInput,
  Row,
  Switch,
  Text,
} from "@once-ui-system/core";
import React from "react";
import { EmojiValueField } from "@/components/dashboard/discord/EmojiField";
import { TextTools } from "@/components/dashboard/text/TextTools";
import { EditorGrid, EditorList } from "./EditorGrid";

/** Discord allows at most 25 options per select menu. */
const MAX_OPTIONS = 25;

export interface SelectMenuEditorProps {
  value: SelectMenuCustom;
  guildId: string;
  onChange: (next: SelectMenuCustom) => void;
}

export function SelectMenuEditor({ value, guildId, onChange }: SelectMenuEditorProps) {
  const t = useT();
  const update = (patch: Partial<SelectMenuCustom>) => onChange({ ...value, ...patch });

  const addOption = () => {
    const opt: SelectMenuOptionCustom = {
      label: t("builder.defaults.selectMenu.option", { n: value.options.length + 1 }),
      value: generateID(guildId, "opt"),
      description: undefined,
      emoji: undefined,
      default: false,
    };
    update({ options: [...value.options, opt] });
  };
  const updateOption = (i: number, patch: Partial<SelectMenuOptionCustom>) => {
    update({ options: value.options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)) });
  };
  const duplicateOption = (i: number) => {
    const source = value.options[i];
    if (!source || value.options.length >= MAX_OPTIONS) return;
    const copy: SelectMenuOptionCustom = {
      ...source,
      value: generateID(guildId, "opt"),
      default: false,
    };
    update({ options: [...value.options.slice(0, i + 1), copy, ...value.options.slice(i + 1)] });
  };
  const removeOption = (i: number) => {
    update({ options: value.options.filter((_, idx) => idx !== i) });
  };
  const moveOption = (i: number, direction: number) => {
    const newIndex = i + direction;
    if (newIndex < 0 || newIndex >= value.options.length) return;
    const newOptions = [...value.options];
    const [moved] = newOptions.splice(i, 1);
    newOptions.splice(newIndex, 0, moved);
    update({ options: newOptions });
  };

  return (
    <Column fillWidth gap="16">
      <EditorGrid>
        <Input
          id="select-name"
          label={t("builder.shared.internalName")}
          value={value.name}
          onChange={(e) => update({ name: e.target.value })}
          maxLength={100}
        />
        <TextTools
          id="select-placeholder"
          value={value.placeholder ?? ""}
          onValueChange={(placeholder) => update({ placeholder: placeholder || undefined })}
          emoji="unicode"
        >
          <Input
            id="select-placeholder"
            label={t("builder.selectMenus.placeholder")}
            value={value.placeholder ?? ""}
            onChange={(e) => update({ placeholder: e.target.value || undefined })}
            maxLength={150}
            characterCount
          />
        </TextTools>
      </EditorGrid>
      <Text variant="body-default-s" onBackground="neutral-weak">
        {t("builder.shared.customId")} <InlineCode>{value.id}</InlineCode>
      </Text>

      <Row gap="12" fillWidth>
        <NumberInput
          id="select-min"
          label={t("builder.selectMenus.minSelected")}
          value={value.minValues ?? 1}
          min={0}
          max={25}
          step={1}
          onChange={(v) => update({ minValues: Number(v) || undefined })}
        />
        <NumberInput
          id="select-max"
          label={t("builder.selectMenus.maxSelected")}
          value={value.maxValues ?? 1}
          min={1}
          max={25}
          step={1}
          onChange={(v) => update({ maxValues: Number(v) || undefined })}
        />
      </Row>

      <Switch
        label={t("builder.selectMenus.disabled")}
        checked={!!value.disabled}
        onToggle={() => update({ disabled: !value.disabled })}
      />

      <Row fillWidth horizontal="between" vertical="center" gap="8">
        <Text variant="label-default-s">
          {t("builder.selectMenus.optionsCount", { count: value.options.length, max: MAX_OPTIONS })}
        </Text>
        <Button prefixIcon="plus" onClick={addOption} disabled={value.options.length >= MAX_OPTIONS}>
          {t("builder.selectMenus.addOption")}
        </Button>
      </Row>

      <EditorList>
        {value.options.map((opt, i) => (
          <OptionEditor
            key={opt.value}
            option={opt}
            canDuplicate={value.options.length < MAX_OPTIONS}
            onChange={(patch) => updateOption(i, patch)}
            onDuplicate={() => duplicateOption(i)}
            onDelete={() => removeOption(i)}
            onMove={(direction) => moveOption(i, direction)}
          />
        ))}
      </EditorList>
    </Column>
  );
}

function OptionEditor({
  option,
  canDuplicate,
  onChange,
  onDuplicate,
  onDelete,
  onMove,
}: {
  option: SelectMenuOptionCustom;
  canDuplicate: boolean;
  onChange: (patch: Partial<SelectMenuOptionCustom>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (direction: number) => void;
}) {
  const t = useT();
  return (
    <Accordion
      title={
        <Row horizontal="between" vertical="center" gap="8">
          <Text variant="body-strong-s" style={{ wordBreak: "break-word" }}>
            {option.label || t("builder.fallback.unnamedOption")}
          </Text>
        </Row>
      }
      fillWidth
    >
      <Column fillWidth gap="8" border="neutral-weak" radius="m">
        <Row gap="4" horizontal="end" vertical="center" onClick={(e) => e.stopPropagation()}>
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
          <IconButton
            icon="copy"
            variant="secondary"
            tooltip={t("builder.shared.duplicate")}
            disabled={!canDuplicate}
            onClick={onDuplicate}
          />
          <IconButton icon="trash" variant="danger" tooltip={t("builder.selectMenus.deleteOption")} onClick={onDelete} />
        </Row>
        <TextTools
          id={`opt-label-${option.value}`}
          value={option.label}
          onValueChange={(label) => onChange({ label })}
          emoji="unicode"
        >
          <Input
            id={`opt-label-${option.value}`}
            label={t("builder.selectMenus.label")}
            value={option.label}
            onChange={(e) => onChange({ label: e.target.value })}
            maxLength={100}
            characterCount
          />
        </TextTools>
        <TextTools
          id={`opt-desc-${option.value}`}
          value={option.description ?? ""}
          onValueChange={(description) => onChange({ description: description || undefined })}
          emoji="unicode"
        >
          <Input
            id={`opt-desc-${option.value}`}
            label={t("builder.selectMenus.description")}
            value={option.description ?? ""}
            onChange={(e) => onChange({ description: e.target.value || undefined })}
            maxLength={100}
            characterCount
          />
        </TextTools>
        <EmojiValueField
          id={`opt-emoji-${option.value}`}
          label={t("builder.shared.emoji")}
          value={option.emoji}
          onChange={(emoji) => onChange({ emoji })}
        />
        <Switch
          label={t("builder.selectMenus.defaultSelected")}
          checked={!!option.default}
          onToggle={() => onChange({ default: !option.default })}
        />
      </Column>
    </Accordion>
  );
}
