"use client";

import { ColorInput } from "@/components/dashboard/ColorInput";
import { EmojiField } from "@/components/dashboard/discord/EmojiField";
import { useT } from "@/i18n/client";
import type { EmbedCustom, EmbedField } from "@/lib/db/types";
import { resolveDiscordColor } from "@/lib/discord/discord-style";
import {
  Accordion,
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
import styles from "./Editors.module.scss";

/** Discord allows at most 25 fields per embed. */
const MAX_FIELDS = 25;

export interface EmbedEditorProps {
  value: EmbedCustom;
  guildId: string;
  onChange: (next: EmbedCustom) => void;
}

export function EmbedEditor({ value, onChange }: EmbedEditorProps) {
  const t = useT();
  const update = (patch: Partial<EmbedCustom>) =>
    onChange({ ...value, ...patch });

  const addField = () => {
    const f: EmbedField = {
      name: t("builder.defaults.embed.field"),
      value: t("builder.defaults.embed.fieldValue"),
      inline: false,
    };
    update({ fields: [...(value.fields ?? []), f] });
  };
  const updateFieldAt = (i: number, patch: Partial<EmbedField>) => {
    const fields = value.fields ?? [];
    update({
      fields: fields.map((f, idx) => (idx === i ? { ...f, ...patch } : f)),
    });
  };
  const removeField = (i: number) => {
    update({ fields: (value.fields ?? []).filter((_, idx) => idx !== i) });
  };
  const moveField = (i: number, direction: number) => {
    const fields = value.fields ?? [];
    const newIndex = i + direction;
    if (newIndex < 0 || newIndex >= fields.length) return;
    const newFields = [...fields];
    const [moved] = newFields.splice(i, 1);
    newFields.splice(newIndex, 0, moved);
    update({ fields: newFields });
  };

  return (
    <Column fillWidth gap="16">
      <Input
        id="embed-name"
        label={t("builder.shared.internalName")}
        value={value.name}
        onChange={(e) => update({ name: e.target.value })}
        maxLength={100}
      />

      <Accordion title={t("builder.embeds.sectionContent")} fillWidth>
        <Column fillWidth gap="8">
          <EmojiField
            id="embed-title"
            value={value.title ?? ""}
            onValueChange={(title) => update({ title: title || undefined })}
          >
            <Input
              id="embed-title"
              label={t("builder.embeds.title")}
              value={value.title ?? ""}
              onChange={(e) => update({ title: e.target.value || undefined })}
              maxLength={256}
              characterCount
            />
          </EmojiField>
          <EmojiField
            id="embed-description"
            value={value.description ?? ""}
            onValueChange={(description) =>
              update({ description: description || undefined })
            }
            multiline
          >
            <Textarea
              id="embed-description"
              label={t("builder.embeds.description")}
              value={value.description ?? ""}
              onChange={(e) =>
                update({ description: e.target.value || undefined })
              }
              maxLength={4096}
              lines={4}
              characterCount
              resize="vertical"
            />
          </EmojiField>
          <ColorInput
            id="embed-color"
            label={t("builder.embeds.color")}
            value={resolveDiscordColor(value.color)}
            onChange={(e) =>
              update({
                color: (e.target.value || undefined) as EmbedCustom["color"],
              })
            }
            presets={PRESERVED_COLORS}
          />
        </Column>
      </Accordion>

      <Accordion title={t("builder.embeds.sectionAuthor")} fillWidth>
        <Column fillWidth gap="8">
          <EmojiField
            id="embed-author-name"
            value={value.author?.name ?? ""}
            onValueChange={(name) =>
              update({
                author: {
                  name,
                  icon_url: value.author?.icon_url,
                  url: value.author?.url,
                },
              })
            }
          >
            <Input
              id="embed-author-name"
              label={t("builder.embeds.authorName")}
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
          </EmojiField>
          <Input
            id="embed-author-icon"
            label={t("builder.embeds.authorIcon")}
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
            label={t("builder.embeds.authorUrl")}
            value={value.author?.url ?? ""}
            onChange={(e) =>
              update({
                author: {
                  ...(value.author ?? { name: "" }),
                  url: e.target.value || undefined,
                },
              })
            }
          />
        </Column>
      </Accordion>

      <Accordion title={t("builder.embeds.sectionMedia")} fillWidth>
        <Column fillWidth gap="8">
          <Input
            id="embed-thumbnail"
            label={t("builder.embeds.thumbnail")}
            value={value.thumbnail ?? ""}
            onChange={(e) => update({ thumbnail: e.target.value || undefined })}
          />
          <Input
            id="embed-image"
            label={t("builder.embeds.image")}
            value={value.image ?? ""}
            onChange={(e) => update({ image: e.target.value || undefined })}
          />
        </Column>
      </Accordion>

      <Accordion title={t("builder.embeds.sectionFooter")} fillWidth>
        <Column fillWidth gap="8">
          <EmojiField
            id="embed-footer-text"
            value={value.footer?.text ?? ""}
            onValueChange={(text) =>
              update({ footer: { text, icon_url: value.footer?.icon_url } })
            }
          >
            <Input
              id="embed-footer-text"
              label={t("builder.embeds.footerText")}
              value={value.footer?.text ?? ""}
              onChange={(e) =>
                update({
                  footer: {
                    text: e.target.value,
                    icon_url: value.footer?.icon_url,
                  },
                })
              }
              maxLength={2048}
            />
          </EmojiField>
          <Input
            id="embed-footer-icon"
            label={t("builder.embeds.footerIcon")}
            value={value.footer?.icon_url ?? ""}
            onChange={(e) =>
              update({
                footer: {
                  text: value.footer?.text ?? "",
                  icon_url: e.target.value || undefined,
                },
              })
            }
          />
          <Switch
            label={t("builder.embeds.showTimestamp")}
            description={t("builder.embeds.showTimestampHint")}
            checked={!!value.timestamp}
            onToggle={() => update({ timestamp: !value.timestamp })}
          />
        </Column>
      </Accordion>

      <Row fillWidth horizontal="between" vertical="center" gap="8">
        <Text variant="label-default-s">
          {t("builder.embeds.fieldsCount", {
            count: value.fields?.length ?? 0,
            max: MAX_FIELDS,
          })}
        </Text>
        <Button
          prefixIcon="plus"
          onClick={addField}
          disabled={(value.fields?.length ?? 0) >= MAX_FIELDS}
        >
          {t("builder.embeds.addField")}
        </Button>
      </Row>

      <div className={styles.list}>
        {(value.fields ?? []).map((field, i) => (
          <FieldEditor
            key={i}
            field={field}
            onChange={(patch) => updateFieldAt(i, patch)}
            onMove={(direction) => moveField(i, direction)}
            onDelete={() => removeField(i)}
          />
        ))}
      </div>
    </Column>
  );
}

function FieldEditor({
  field,
  onChange,
  onMove,
  onDelete,
}: {
  field: EmbedField;
  onChange: (patch: Partial<EmbedField>) => void;
  onMove: (direction: number) => void;
  onDelete: () => void;
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
      <Column fillWidth gap="8" border="neutral-weak" radius="m">
        <Row
          gap="4"
          horizontal="end"
          vertical="center"
          onClick={(e) => e.stopPropagation()}
        >
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
            icon="trash"
            variant="danger"
            tooltip={t("builder.embeds.deleteField")}
            onClick={onDelete}
          />
        </Row>
        <EmojiField
          id={`field-name-${field.name}`}
          value={field.name}
          onValueChange={(name) => onChange({ name })}
        >
          <Input
            id={`field-name-${field.name}`}
            label={t("builder.embeds.fieldName")}
            value={field.name}
            onChange={(e) => onChange({ name: e.target.value })}
            maxLength={256}
          />
        </EmojiField>
        <EmojiField
          id={`field-value-${field.name}`}
          value={field.value}
          onValueChange={(v) => onChange({ value: v })}
          multiline
        >
          <Textarea
            id={`field-value-${field.name}`}
            label={t("builder.embeds.fieldValue")}
            value={field.value}
            onChange={(e) => onChange({ value: e.target.value })}
            maxLength={1024}
            lines={2}
            resize="vertical"
          />
        </EmojiField>
        <Switch
          label={t("builder.embeds.inline")}
          checked={!!field.inline}
          onToggle={() => onChange({ inline: !field.inline })}
        />
      </Column>
    </Accordion>
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
