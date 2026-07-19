"use client";

import { generateID } from "@/lib/db/generateID";
import type { IModalField, ModalCustom } from "@/lib/db/types";
import {
    Accordion,
    Button,
    Column,
    IconButton,
    InlineCode,
    Input,
    NumberInput,
    Row,
    SegmentedControl,
    Switch,
    Text,
} from "@once-ui-system/core";
import React from "react";

export interface ModalEditorProps {
  value: ModalCustom;
  guildId: string;
  onChange: (next: ModalCustom) => void;
}

export function ModalEditor({ value, guildId, onChange }: ModalEditorProps) {
  const update = (patch: Partial<ModalCustom>) => onChange({ ...value, ...patch });

  const addField = () => {
    const field: IModalField = {
      id: generateID(guildId, "field"),
      name: "New field",
      type: "short",
      required: true,
    };
    update({ fields: [...value.fields, field] });
  };
  const updateField = (i: number, patch: Partial<IModalField>) => {
    const nextFields = value.fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f));
    update({ fields: nextFields });
  };
  const removeField = (i: number) => {
    update({ fields: value.fields.filter((_, idx) => idx !== i) });
  };

  return (
    <Column fillWidth gap="16">
      <Input
        id="modal-title"
        label="Title"
        value={value.title}
        onChange={(e) => update({ title: e.target.value })}
        characterCount
        maxLength={45}
      />
      <Text variant="body-default-s" onBackground="neutral-weak">
        Custom id: <InlineCode>{value.id}</InlineCode>. Discord allows up to 5 fields per modal.
      </Text>
      <Row fillWidth horizontal="between" vertical="center" gap="8">
        <Text variant="label-default-s">Fields ({value.fields.length}/5)</Text>
        <Button prefixIcon="plus" onClick={addField} disabled={value.fields.length >= 5}>
          Add field
        </Button>
      </Row>

      {value.fields.length === 0 && (
        <Text variant="body-default-s" onBackground="neutral-weak">
          No fields yet. A modal can optionally have up to 5 text inputs.
        </Text>
      )}

      {value.fields.map((field, i) => (
        <FieldRow
          key={field.id}
          field={field}
          onChange={(patch) => updateField(i, patch)}
          onDelete={() => removeField(i)}
        />
      ))}
    </Column>
  );
}

function FieldRow({
  field,
  onChange,
  onDelete,
}: {
  field: IModalField;
  onChange: (patch: Partial<IModalField>) => void;
  onDelete: () => void;
}) {
  return (
    <Accordion title={
        <Row horizontal="between" vertical="center" gap="8">
            <Text variant="body-strong-s" style={{ wordBreak: "break-word" }}>
                {field.name || "Unnamed field"}
            </Text>
            <Row gap="4" vertical="center" onClick={(e) => e.stopPropagation()}>
                <IconButton
                    icon="trash"
                    variant="ghost"
                    size="s"
                    tooltip="Delete field"
                    onClick={onDelete}
                />
            </Row>
        </Row>
    } fillWidth>
        <Column fillWidth gap="8" border="neutral-weak" radius="m" background="surface">
            <Input
                id={`field-${field.id}-name`}
                label="Label"
                value={field.name}
                onChange={(e) => onChange({ name: e.target.value })}
                maxLength={45}
                characterCount
            />
            <Input
                id={`field-${field.id}-placeholder`}
                label="Placeholder"
                value={field.placeholder ?? ""}
                onChange={(e) => onChange({ placeholder: e.target.value || undefined })}
                maxLength={100}
                characterCount
            />
            <SegmentedControl
                fillWidth
                selected={field.type}
                onToggle={(v) => onChange({ type: v as "short" | "long" })}
                buttons={[
                    { label: "Short", value: "short" },
                    { label: "Paragraph", value: "long" },
                ]}
            />
            <Row gap="12" fillWidth>
                <NumberInput
                    id={`field-${field.id}-min`}
                    label="Min length"
                    value={field.min ?? 0}
                    min={0}
                    max={4000}
                    step={1}
                    onChange={(v) => onChange({ min: Number(v) || undefined })}
                />
                <NumberInput
                    id={`field-${field.id}-max`}
                    label="Max length"
                    value={field.max ?? 0}
                    min={1}
                    max={4000}
                    step={1}
                    onChange={(v) => onChange({ max: Number(v) || undefined })}
                />
            </Row>
            <Switch
                label="Required"
                isChecked={field.required}
                onToggle={() => onChange({ required: !field.required })}
            />
        </Column>
    </Accordion>
  );
}

// `defaultModal` lives in componentsTypes (DEFAULT_FACTORIES) so the manager
// seeds a complete item before opening this editor. This component is fully
// controlled by `value` + `onChange`.
