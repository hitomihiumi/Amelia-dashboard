"use client";

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

export interface SelectMenuEditorProps {
  value: SelectMenuCustom;
  guildId: string;
  onChange: (next: SelectMenuCustom) => void;
}

export function SelectMenuEditor({ value, guildId, onChange }: SelectMenuEditorProps) {
  const update = (patch: Partial<SelectMenuCustom>) => onChange({ ...value, ...patch });

  const addOption = () => {
    const opt: SelectMenuOptionCustom = {
      label: "New option",
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
      <Input
        id="select-name"
        label="Name (internal)"
        value={value.name}
        onChange={(e) => update({ name: e.target.value })}
        maxLength={100}
      />
      <Input
        id="select-placeholder"
        label="Placeholder"
        value={value.placeholder ?? ""}
        onChange={(e) => update({ placeholder: e.target.value || undefined })}
        maxLength={150}
        characterCount
      />
      <Text variant="body-default-s" onBackground="neutral-weak">
        Custom id: <InlineCode>{value.id}</InlineCode>
      </Text>

      <Row gap="12" fillWidth>
        <NumberInput
          id="select-min"
          label="Min selected"
          value={value.minValues ?? 1}
          min={0}
          max={25}
          step={1}
          onChange={(v) => update({ minValues: Number(v) || undefined })}
        />
        <NumberInput
          id="select-max"
          label="Max selected"
          value={value.maxValues ?? 1}
          min={1}
          max={25}
          step={1}
          onChange={(v) => update({ maxValues: Number(v) || undefined })}
        />
      </Row>

      <Switch
        label="Disabled"
        isChecked={!!value.disabled}
        onToggle={() => update({ disabled: !value.disabled })}
      />

      <Row fillWidth horizontal="between" vertical="center" gap="8">
        <Text variant="label-default-s">Options ({value.options.length}/25)</Text>
        <Button prefixIcon="plus" onClick={addOption} disabled={value.options.length >= 25}>
          Add option
        </Button>
      </Row>

      {value.options.map((opt, i) => (
        <OptionEditor
          key={opt.value}
          option={opt}
          onChange={(patch) => updateOption(i, patch)}
          onDelete={() => removeOption(i)}
          onMove={(direction) => moveOption(i, direction)}
        />
      ))}
    </Column>
  );
}

function OptionEditor({
  option,
  onChange,
  onDelete,
  onMove,
}: {
  option: SelectMenuOptionCustom;
  onChange: (patch: Partial<SelectMenuOptionCustom>) => void;
  onDelete: () => void;
  onMove: (direction: number) => void;
}) {
  return (
    <Accordion
      title={
        <Row horizontal="between" vertical="center" gap="8">
          <Text variant="body-strong-s" style={{ wordBreak: "break-word" }}>
            {option.label || "Unnamed option"}
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
            tooltip="Move up"
          />
          <IconButton
            icon="chevronDown"
            variant="secondary"
            onClick={() => onMove(1)}
            tooltip="Move down"
          />
          <IconButton icon="trash" variant="danger" tooltip="Delete option" onClick={onDelete} />
        </Row>
        <Input
          id={`opt-label-${option.value}`}
          label="Label"
          value={option.label}
          onChange={(e) => onChange({ label: e.target.value })}
          maxLength={100}
        />
        <Input
          id={`opt-desc-${option.value}`}
          label="Description"
          value={option.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value || undefined })}
          maxLength={100}
        />
        <Input
          id={`opt-emoji-${option.value}`}
          label="Emoji (unicode or <name:id>)"
          value={emojiToString(option.emoji)}
          onChange={(e) => onChange({ emoji: e.target.value || undefined })}
        />
        <Switch
          label="Default selected"
          isChecked={!!option.default}
          onToggle={() => onChange({ default: !option.default })}
        />
      </Column>
    </Accordion>
  );
}

function emojiToString(emoji: unknown): string {
  if (!emoji) return "";
  if (typeof emoji === "string") return emoji;
  const e = emoji as { name?: string; id?: string };
  return e.id ? `<:${e.name || "emoji"}:${e.id}>` : e.name || "";
}
// `defaultSelect` lives in componentsTypes (DEFAULT_FACTORIES) so the manager
// seeds a complete item before opening this editor.
