"use client";

import { ColorInput } from "@/components/dashboard/ColorInput";
import type { EmbedCustom, EmbedField } from "@/lib/db/types";
import { resolveDiscordColor } from "@/lib/discord/discord-style";
import {
  Button,
  Column,
  IconButton,
  Input,
  Row,
  Switch,
  Text,
  Textarea,
} from "@once-ui-system/core";
import React from "react";

export interface EmbedEditorProps {
  value: EmbedCustom;
  guildId: string;
  onChange: (next: EmbedCustom) => void;
}

export function EmbedEditor({ value, onChange }: EmbedEditorProps) {
  const update = (patch: Partial<EmbedCustom>) => onChange({ ...value, ...patch });

  const addField = () => {
    const f: EmbedField = { name: "New field", value: "Value", inline: false };
    update({ fields: [...(value.fields ?? []), f] });
  };
  const updateFieldAt = (i: number, patch: Partial<EmbedField>) => {
    const fields = value.fields ?? [];
    update({ fields: fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)) });
  };
  const removeField = (i: number) => {
    update({ fields: (value.fields ?? []).filter((_, idx) => idx !== i) });
  };

  return (
    <Column fillWidth gap="16">
        <Input
          id="embed-name"
          label="Name (internal)"
          value={value.name}
          onChange={(e) => update({ name: e.target.value })}
          maxLength={100}
        />
        <Input
          id="embed-title"
          label="Title"
          value={value.title ?? ""}
          onChange={(e) => update({ title: e.target.value || undefined })}
          maxLength={256}
          characterCount
        />
        <Textarea
          id="embed-description"
          label="Description"
          value={value.description ?? ""}
          onChange={(e) => update({ description: e.target.value || undefined })}
          maxLength={4096}
          lines={4}
          characterCount
          resize="vertical"
        />
        <ColorInput
          id="embed-color"
          label="Color"
          value={resolveDiscordColor(value.color)}
          onChange={(e) => update({ color: (e.target.value || undefined) as EmbedCustom["color"] })}
          presets={PRESERVED_COLORS}
        />

        <Column
          gap="12"
          fillWidth
          padding="16"
          border="neutral-weak"
          radius="m"
          background="neutral-alpha-weak"
        >
          <Text variant="label-strong-s">Author</Text>
          <Input
            id="embed-author-name"
            label="Author name"
            value={value.author?.name ?? ""}
            onChange={(e) =>
              update({
                author: {
                  name: e.target.value,
                  icon_url: value.author?.icon_url,
                  url: value.author?.url,
                },
              })
            }
            maxLength={256}
          />
          <Row gap="12" fillWidth>
            <Input
              id="embed-author-icon"
              label="Author icon URL"
              value={value.author?.icon_url ?? ""}
              onChange={(e) =>
                update({
                  author: {
                    ...(value.author ?? { name: "" }),
                    icon_url: e.target.value || undefined,
                  },
                })
              }
            />
            <Input
              id="embed-author-url"
              label="Author URL"
              value={value.author?.url ?? ""}
              onChange={(e) =>
                update({
                  author: { ...(value.author ?? { name: "" }), url: e.target.value || undefined },
                })
              }
            />
          </Row>
        </Column>

        <Column
          gap="12"
          fillWidth
          padding="16"
          border="neutral-weak"
          radius="m"
          background="neutral-alpha-weak"
        >
          <Text variant="label-strong-s">Media</Text>
          <Row gap="12" fillWidth>
            <Input
              id="embed-thumbnail"
              label="Thumbnail URL"
              value={value.thumbnail ?? ""}
              onChange={(e) => update({ thumbnail: e.target.value || undefined })}
            />
            <Input
              id="embed-image"
              label="Image URL"
              value={value.image ?? ""}
              onChange={(e) => update({ image: e.target.value || undefined })}
            />
          </Row>
        </Column>

        <Column
          gap="12"
          fillWidth
          padding="16"
          border="neutral-weak"
          radius="m"
          background="neutral-alpha-weak"
        >
          <Text variant="label-strong-s">Footer</Text>
          <Input
            id="embed-footer-text"
            label="Footer text"
            value={value.footer?.text ?? ""}
            onChange={(e) =>
              update({ footer: { text: e.target.value, icon_url: value.footer?.icon_url } })
            }
            maxLength={2048}
          />
          <Input
            id="embed-footer-icon"
            label="Footer icon URL"
            value={value.footer?.icon_url ?? ""}
            onChange={(e) =>
              update({
                footer: { text: value.footer?.text ?? "", icon_url: e.target.value || undefined },
              })
            }
          />
          <Switch
            label="Show timestamp"
            description="Append the current time to the footer"
            isChecked={!!value.timestamp}
            onToggle={() => update({ timestamp: !value.timestamp })}
          />
        </Column>

        <Row fillWidth horizontal="between" vertical="center" gap="8">
          <Text variant="label-default-s">Fields ({value.fields?.length ?? 0}/25)</Text>
          <Button prefixIcon="plus" onClick={addField} disabled={(value.fields?.length ?? 0) >= 25}>
            Add field
          </Button>
        </Row>

        {(value.fields ?? []).map((field, i) => (
          <FieldEditor
            key={i}
            field={field}
            onChange={(patch) => updateFieldAt(i, patch)}
            onDelete={() => removeField(i)}
          />
        ))}
      </Column>
  );
}

function FieldEditor({
  field,
  onChange,
  onDelete,
}: {
  field: EmbedField;
  onChange: (patch: Partial<EmbedField>) => void;
  onDelete: () => void;
}) {
  return (
    <Column fillWidth gap="8" padding="16" border="neutral-weak" radius="m">
      <Row fillWidth horizontal="between" vertical="center" gap="8">
        <Input
          id={`field-name-${field.name}`}
          label="Field name"
          value={field.name}
          onChange={(e) => onChange({ name: e.target.value })}
          maxLength={256}
        />
        <IconButton
          icon="trash"
          variant="ghost"
          size="s"
          tooltip="Delete field"
          onClick={onDelete}
        />
      </Row>
      <Textarea
        id={`field-value-${field.name}`}
        label="Field value"
        value={field.value}
        onChange={(e) => onChange({ value: e.target.value })}
        maxLength={1024}
        lines={2}
        resize="vertical"
      />
      <Switch
        label="Inline"
        isChecked={!!field.inline}
        onToggle={() => onChange({ inline: !field.inline })}
      />
    </Column>
  );
}

const PRESERVED_COLORS = [
  "#5865f2",
  "#248046",
  "#da373c",
  "#f1c40f",
  "#11806a",
  "#e91e63",
  "#9b59b6",
  "#e67e22",
  "#1abc9c",
  "#71368a",
  "#1e1f22",
  "#ffffff",
  "#99aab5",
  "#2c2f33",
];

// `defaultEmbed` lives in componentsTypes (DEFAULT_FACTORIES) so the manager
// seeds a complete item before opening this editor. This component is fully
// controlled by `value` + `onChange`.
