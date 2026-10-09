"use client";

import { useT } from "@/i18n/client";
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
import { TextTools } from "@/components/dashboard/text/TextTools";
import { EditorList } from "./EditorGrid";
import React from "react";

/** Discord allows at most 5 text inputs per modal. */
const MAX_FIELDS = 5;

export interface ModalEditorProps {
  value: ModalCustom;
  guildId: string;
  onChange: (next: ModalCustom) => void;
}

export function ModalEditor({ value, guildId, onChange }: ModalEditorProps) {
  const t = useT();
  const update = (patch: Partial<ModalCustom>) => onChange({ ...value, ...patch });

  const addField = () => {
    const field: IModalField = {
      id: generateID(guildId, "field"),
      name: t("builder.defaults.modal.field", { n: value.fields.length + 1 }),
      type: "short",
      required: true,
    };
    update({ fields: [...value.fields, field] });
  };
  const updateField = (i: number, patch: Partial<IModalField>) => {
    const nextFields = value.fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f));
    update({ fields: nextFields });
  };
  const duplicateField = (i: number) => {
    const source = value.fields[i];
    if (!source || value.fields.length >= MAX_FIELDS) return;
    const copy: IModalField = { ...source, id: generateID(guildId, "field") };
    update({ fields: [...value.fields.slice(0, i + 1), copy, ...value.fields.slice(i + 1)] });
  };
  const removeField = (i: number) => {
    update({ fields: value.fields.filter((_, idx) => idx !== i) });
  };
  const moveField = (i: number, direction: number) => {
    const newIndex = i + direction;
    if (newIndex < 0 || newIndex >= value.fields.length) return;
    const newFields = [...value.fields];
    const [moved] = newFields.splice(i, 1);
    newFields.splice(newIndex, 0, moved);
    update({ fields: newFields });
  };

  return (
    <Column fillWidth gap="16">
      <TextTools
        id="modal-title"
        value={value.title}
        onValueChange={(title) => update({ title })}
        emoji="unicode"
      >
        <Input
          id="modal-title"
          label={t("builder.modals.title")}
          value={value.title}
          onChange={(e) => update({ title: e.target.value })}
          characterCount
          maxLength={45}
        />
      </TextTools>
      <Text variant="body-default-s" onBackground="neutral-weak">
        {t("builder.shared.customId")} <InlineCode>{value.id}</InlineCode>.{" "}
        {t("builder.modals.limitHint", { max: MAX_FIELDS })}
      </Text>
      <Row fillWidth horizontal="between" vertical="center" gap="8">
        <Text variant="label-default-s">
          {t("builder.modals.fieldsCount", { count: value.fields.length, max: MAX_FIELDS })}
        </Text>
        <Button prefixIcon="plus" onClick={addField} disabled={value.fields.length >= MAX_FIELDS}>
          {t("builder.modals.addField")}
        </Button>
      </Row>

      {value.fields.length === 0 && (
        <Text variant="body-default-s" onBackground="neutral-weak">
          {t("builder.modals.noFields", { max: MAX_FIELDS })}
        </Text>
      )}

      <EditorList>
        {value.fields.map((field, i) => (
          <FieldRow
            key={field.id}
            field={field}
            canDuplicate={value.fields.length < MAX_FIELDS}
            onChange={(patch) => updateField(i, patch)}
            onDuplicate={() => duplicateField(i)}
            onDelete={() => removeField(i)}
            onMove={(direction) => moveField(i, direction)}
          />
        ))}
      </EditorList>
    </Column>
  );
}

function FieldRow({
  field,
  canDuplicate,
  onChange,
  onDuplicate,
  onDelete,
  onMove,
}: {
  field: IModalField;
  canDuplicate: boolean;
  onChange: (patch: Partial<IModalField>) => void;
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
            {field.name || t("builder.fallback.unnamedField")}
          </Text>
        </Row>
      }
      fillWidth
    >
      <Column fillWidth gap="8" border="neutral-weak" radius="m" background="surface">
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
          <IconButton icon="trash" variant="danger" tooltip={t("builder.modals.deleteField")} onClick={onDelete} />
        </Row>
        <TextTools
          id={`field-${field.id}-name`}
          value={field.name}
          onValueChange={(name) => onChange({ name })}
          emoji="unicode"
        >
          <Input
            id={`field-${field.id}-name`}
            label={t("builder.modals.label")}
            value={field.name}
            onChange={(e) => onChange({ name: e.target.value })}
            maxLength={45}
            characterCount
          />
        </TextTools>
        <TextTools
          id={`field-${field.id}-placeholder`}
          value={field.placeholder ?? ""}
          onValueChange={(placeholder) => onChange({ placeholder: placeholder || undefined })}
          emoji="unicode"
        >
          <Input
            id={`field-${field.id}-placeholder`}
            label={t("builder.modals.placeholder")}
            value={field.placeholder ?? ""}
            onChange={(e) => onChange({ placeholder: e.target.value || undefined })}
            maxLength={100}
            characterCount
          />
        </TextTools>
        <SegmentedControl
          fillWidth
          value={field.type}
          onChange={(v) => onChange({ type: v as "short" | "long" })}
          buttons={[
            { label: t("builder.modals.short"), value: "short" },
            { label: t("builder.modals.paragraph"), value: "long" },
          ]}
        />
        <Row gap="12" fillWidth>
          <NumberInput
            id={`field-${field.id}-min`}
            label={t("builder.modals.minLength")}
            value={field.min ?? 0}
            min={0}
            max={4000}
            step={1}
            onChange={(v) => onChange({ min: Number(v) || undefined })}
          />
          <NumberInput
            id={`field-${field.id}-max`}
            label={t("builder.modals.maxLength")}
            value={field.max ?? 0}
            min={1}
            max={4000}
            step={1}
            onChange={(v) => onChange({ max: Number(v) || undefined })}
          />
        </Row>
        <Switch
          label={t("builder.modals.required")}
          checked={field.required}
          onToggle={() => onChange({ required: !field.required })}
        />
      </Column>
    </Accordion>
  );
}

// `defaultModal` lives in componentsTypes (DEFAULT_FACTORIES) so the manager
// seeds a complete item before opening this editor. This component is fully
// controlled by `value` + `onChange`.
