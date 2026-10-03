"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Accordion,
  Button,
  Column,
  Flex,
  IconButton,
  Input,
  Line,
  NumberInput,
  Row,
  SegmentedControl,
  Switch,
  Text,
  Textarea,
  useToast,
} from "@once-ui-system/core";
import { useRouter } from "next/navigation";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import { ChannelSelect } from "@/components/dashboard/discord/ChannelSelect";
import { ChannelPill } from "@/components/dashboard/discord/ChannelPill";
import { generateID } from "@/lib/db/generateID";
import type { ChannelPickOption } from "@/lib/discord/channel-type";
import type {
  ModerationForm,
  ModerationFormField,
  ModerationFormFieldType,
} from "@/lib/db/types";
import type { GuildActionState } from "@/types/dashboard";
import { updateModerationForms } from "../actions";
import { Section } from "@/components/dashboard/Section";
import { SectionGrid } from "@/components/layout/SectionGrid";
import { IconName } from "@/resources/icons";
import styles from "./FormsBuilder.module.scss";
import { useT } from "@/i18n/client";

const FIELD_TYPES: ModerationFormFieldType[] = [
  "short",
  "paragraph",
  "number",
  "boolean",
  "select",
  "user",
  "channel",
  "message_link",
  "url",
];

const MAX_FIELDS = 15;
const MAX_OPTIONS = 25;

export function FormsBuilder({
  guildId,
  baseUrl,
  defaultReport,
  defaultAppeal,
  textChannels,
}: {
  guildId: string;
  baseUrl: string;
  defaultReport: ModerationForm;
  defaultAppeal: ModerationForm;
  textChannels: ChannelPickOption[];
}) {
  const t = useT();
  const router = useRouter();
  const { addToast } = useToast();
  const { setIsDirty, setSaveAction, setCancelAction } = useUnsavedChanges();

  const [report, setReport] = useState(defaultReport);
  const [appeal, setAppeal] = useState(defaultAppeal);
  const [baseline, setBaseline] = useState({
    report: defaultReport,
    appeal: defaultAppeal,
  });

  const isDirty = useMemo(
    () =>
      JSON.stringify(report) !== JSON.stringify(baseline.report) ||
      JSON.stringify(appeal) !== JSON.stringify(baseline.appeal),
    [report, appeal, baseline],
  );

  useEffect(() => {
    setIsDirty(isDirty);
  }, [isDirty, setIsDirty]);

  const channelOptions = useMemo(
    () =>
      textChannels.map((channel) => ({
        label: <ChannelPill channel={channel} />,
        value: channel.id,
      })),
    [textChannels],
  );

  const handleSave = useCallback(async () => {
    const fd = new FormData();
    fd.set("report", JSON.stringify(report));
    fd.set("appeal", JSON.stringify(appeal));

    const result: GuildActionState = await updateModerationForms(guildId, fd);

    if (result?.ok) {
      setBaseline({ report, appeal });
      addToast({ message: t("moderation.forms.saved"), variant: "success" });
      router.refresh();
    } else {
      addToast({
        message: result?.error || t("moderation.errors.saveFailed"),
        variant: "danger",
      });
    }
  }, [guildId, report, appeal, router, addToast, t]);

  const handleCancel = useCallback(() => {
    setReport(baseline.report);
    setAppeal(baseline.appeal);
  }, [baseline]);

  useEffect(() => {
    setSaveAction(handleSave);
    setCancelAction(handleCancel);
    return () => {
      setSaveAction(null);
      setCancelAction(null);
    };
  }, [handleSave, handleCancel, setSaveAction, setCancelAction]);

  return (
    <SectionGrid>
      <FormEditor
        title={t("moderation.forms.report.title")}
        description={t("moderation.forms.report.description")}
        publicUrl={`${baseUrl}/submit/${guildId}/report`}
        guildId={guildId}
        form={report}
        onChange={setReport}
        channelOptions={channelOptions}
        kind="report"
        num={1}
        icon="warning"
      />

      <FormEditor
        title={t("moderation.forms.appeal.title")}
        description={t("moderation.forms.appeal.description")}
        publicUrl={`${baseUrl}/submit/${guildId}/appeal`}
        guildId={guildId}
        form={appeal}
        onChange={setAppeal}
        channelOptions={channelOptions}
        kind="appeal"
        num={2}
        icon="refresh"
      />
    </SectionGrid>
  );
}

function FormEditor({
  title,
  description,
  publicUrl,
  guildId,
  form,
  onChange,
  channelOptions,
  kind,
  num,
  icon,
}: {
  title: string;
  description: string;
  publicUrl: string;
  guildId: string;
  form: ModerationForm;
  onChange: (next: ModerationForm) => void;
  channelOptions: { label: React.ReactNode; value: string }[];
  kind: "report" | "appeal";
  num: number;
  icon: IconName;
}) {
  const t = useT();
  const update = (patch: Partial<ModerationForm>) =>
    onChange({ ...form, ...patch });

  const addField = () => {
    const field: ModerationFormField = {
      id: generateID(guildId, "field"),
      label: t("moderation.forms.newQuestion"),
      description: null,
      type: "paragraph",
      required: true,
      placeholder: null,
      min: null,
      max: null,
      options: [],
    };
    update({ fields: [...form.fields, field] });
  };

  const updateField = (index: number, patch: Partial<ModerationFormField>) =>
    update({
      fields: form.fields.map((field, i) =>
        i === index ? { ...field, ...patch } : field,
      ),
    });

  const removeField = (index: number) =>
    update({ fields: form.fields.filter((_, i) => i !== index) });

  const moveField = (index: number, delta: number) => {
    const next = [...form.fields];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    update({ fields: next });
  };

  return (
    <Section
      title={title}
      description={description}
      num={num}
      icon={icon}
      switcher={
        <Switch
          checked={form.enabled}
          onToggle={() => update({ enabled: !form.enabled })}
        />
      }
    >
      <Text
        variant="body-default-s"
        onBackground="neutral-weak"
        className={styles.link}
      >
        {t("moderation.forms.publicLink", { url: publicUrl })}
      </Text>

      <div className={`${styles.fields} ${styles.fieldsWide}`}>
        <ChannelSelect
          fillWidth
          id={`${kind}-channel`}
          label={t("moderation.forms.channel")}
          options={channelOptions}
          selectedChannel={form.channel ?? ""}
          setSelectedChannel={(value) =>
            update({ channel: (value as string) || null })
          }
        />
      </div>

      <div className={`${styles.fields} ${styles.fieldsWide}`}>
        <NumberInput
          id={`${kind}-cooldown`}
          label={t("moderation.forms.cooldown")}
          value={form.cooldown}
          min={0}
          max={2592000}
          onChange={(value: number) => update({ cooldown: Number(value) || 0 })}
        />
        <NumberInput
          id={`${kind}-max-pending`}
          label={t("moderation.forms.maxPending")}
          value={form.max_pending}
          min={1}
          max={20}
          onChange={(value: number) =>
            update({ max_pending: Number(value) || 1 })
          }
        />
      </div>

      {kind === "report" && (
        <div className={styles.toggles}>
          <Row fillWidth gap="12" vertical="center">
            <Switch
              checked={form.require_target}
              onToggle={() => update({ require_target: !form.require_target })}
            />
            <Text variant="label-default-s">
              {t("moderation.forms.requireTarget")}
            </Text>
          </Row>
          <Row fillWidth gap="12" vertical="center">
            <Switch
              checked={form.allow_anonymous}
              onToggle={() =>
                update({ allow_anonymous: !form.allow_anonymous })
              }
            />
            <Column gap="4">
              <Text variant="label-default-s">
                {t("moderation.forms.hideAuthor")}
              </Text>
              <Text variant="body-default-xs" onBackground="neutral-weak">
                {t("moderation.forms.hideAuthorHint")}
              </Text>
            </Column>
          </Row>
        </div>
      )}

      {kind === "appeal" && (
        <Row fillWidth gap="12" vertical="center">
          <Switch
            checked={form.allow_banned}
            onToggle={() => update({ allow_banned: !form.allow_banned })}
          />
          <Text variant="label-default-s">
            {t("moderation.forms.allowBanned")}
          </Text>
        </Row>
      )}

      <Line />

      <div className={styles.questionsHead}>
        <Text variant="label-default-s">
          {t("moderation.forms.questions", {
            count: form.fields.length,
            max: MAX_FIELDS,
          })}
        </Text>
        <Button
          prefixIcon="plus"
          onClick={addField}
          disabled={form.fields.length >= MAX_FIELDS}
        >
          {t("moderation.forms.addQuestion")}
        </Button>
      </div>

      {form.fields.length === 0 && (
        <Text variant="body-default-s" onBackground="neutral-weak">
          {t("moderation.forms.noQuestions")}
        </Text>
      )}

      {form.fields.length > 0 && (
        <div className={styles.questions}>
          {form.fields.map((field, index) => (
            <Accordion key={field.id} title={`${index + 1}. ${field.label}`}>
              <FieldEditor
                guildId={guildId}
                field={field}
                onChange={(patch) => updateField(index, patch)}
                onDelete={() => removeField(index)}
                onMove={(delta) => moveField(index, delta)}
              />
            </Accordion>
          ))}
        </div>
      )}

      <Line />

      <div className={styles.messages}>
      <Textarea
        id={`${kind}-success`}
        label={t("moderation.forms.successMessage")}
        lines={2}
        value={form.success_message ?? ""}
        onChange={(e) => update({ success_message: e.target.value || null })}
      />
      <Textarea
        id={`${kind}-approve`}
        label={t("moderation.forms.approveMessage")}
        lines={2}
        value={form.approve_message ?? ""}
        onChange={(e) => update({ approve_message: e.target.value || null })}
      />
      <Textarea
        id={`${kind}-reject`}
        label={t("moderation.forms.rejectMessage")}
        lines={2}
        value={form.reject_message ?? ""}
        onChange={(e) => update({ reject_message: e.target.value || null })}
      />
      </div>
    </Section>
  );
}

function FieldEditor({
  guildId,
  field,
  onChange,
  onDelete,
  onMove,
}: {
  guildId: string;
  field: ModerationFormField;
  onChange: (patch: Partial<ModerationFormField>) => void;
  onDelete: () => void;
  onMove: (delta: number) => void;
}) {
  const t = useT();

  const addOption = () =>
    onChange({
      options: [
        ...field.options,
        {
          id: generateID(guildId, "opt"),
          label: t("moderation.forms.newOption"),
          value: `option_${field.options.length + 1}`,
        },
      ],
    });

  return (
    <Column fillWidth gap="16">
      <div className={`${styles.fields} ${styles.fieldsWide}`}>
        <Input
          id={`${field.id}-label`}
          label={t("moderation.forms.field.question")}
          value={field.label}
          maxLength={100}
          onChange={(e) => onChange({ label: e.target.value })}
        />

        <Input
          id={`${field.id}-description`}
          label={t("moderation.forms.field.hint")}
          value={field.description ?? ""}
          maxLength={200}
          onChange={(e) => onChange({ description: e.target.value || null })}
        />
      </div>

      <SegmentedControl
        fillWidth
        buttons={FIELD_TYPES.map((type) => ({
          value: type,
          label: t(`moderation.forms.types.${type}`),
        }))}
        value={field.type}
        onChange={(value) =>
          onChange({ type: value as ModerationFormFieldType })
        }
      />

      {(field.type === "short" ||
        field.type === "paragraph" ||
        field.type === "number") && (
        <div className={styles.fields}>
          <NumberInput
            id={`${field.id}-min`}
            label={
              field.type === "number"
                ? t("moderation.forms.field.minValue")
                : t("moderation.forms.field.minLength")
            }
            value={field.min ?? 0}
            min={0}
            onChange={(value: number) =>
              onChange({ min: Number(value) || null })
            }
          />
          <NumberInput
            id={`${field.id}-max`}
            label={
              field.type === "number"
                ? t("moderation.forms.field.maxValue")
                : t("moderation.forms.field.maxLength")
            }
            value={field.max ?? 0}
            min={0}
            onChange={(value: number) =>
              onChange({ max: Number(value) || null })
            }
          />
        </div>
      )}

      {field.type !== "boolean" && field.type !== "select" && (
        <Input
          id={`${field.id}-placeholder`}
          label={t("moderation.forms.field.placeholder")}
          value={field.placeholder ?? ""}
          maxLength={100}
          onChange={(e) => onChange({ placeholder: e.target.value || null })}
        />
      )}

      {field.type === "select" && (
        <Column fillWidth gap="8">
          <Row fillWidth horizontal="between" vertical="center">
            <Text variant="label-default-s">
              {t("moderation.forms.field.options", {
                count: field.options.length,
                max: MAX_OPTIONS,
              })}
            </Text>
            <Button
              size="s"
              prefixIcon="plus"
              variant="secondary"
              onClick={addOption}
              disabled={field.options.length >= MAX_OPTIONS}
            >
              {t("moderation.forms.field.addOption")}
            </Button>
          </Row>

          {field.options.map((option, i) => (
            <div key={option.id} className={styles.optionRow}>
              <Input
                id={`${option.id}-label`}
                label={t("moderation.forms.field.optionLabel")}
                value={option.label}
                maxLength={100}
                onChange={(e) =>
                  onChange({
                    options: field.options.map((o, index) =>
                      index === i ? { ...o, label: e.target.value } : o,
                    ),
                  })
                }
              />
              <Input
                id={`${option.id}-value`}
                label={t("moderation.forms.field.optionValue")}
                value={option.value}
                maxLength={100}
                onChange={(e) =>
                  onChange({
                    options: field.options.map((o, index) =>
                      index === i ? { ...o, value: e.target.value } : o,
                    ),
                  })
                }
              />
              <IconButton
                icon="trash"
                variant="danger"
                onClick={() =>
                  onChange({
                    options: field.options.filter((_, index) => index !== i),
                  })
                }
              />
            </div>
          ))}
        </Column>
      )}

      <div className={styles.fieldFooter}>
        <Switch
          label={t("moderation.forms.field.required")}
          checked={field.required}
          onToggle={() => onChange({ required: !field.required })}
        />
        <Row gap="8" vertical="center">
          <IconButton
            icon="chevronUp"
            variant="secondary"
            onClick={() => onMove(-1)}
            tooltip={t("moderation.forms.field.moveUp")}
          />
          <IconButton
            icon="chevronDown"
            variant="secondary"
            onClick={() => onMove(1)}
            tooltip={t("moderation.forms.field.moveDown")}
          />
          <IconButton
            icon="trash"
            variant="danger"
            onClick={onDelete}
            tooltip={t("moderation.forms.field.delete")}
          />
        </Row>
      </div>
    </Column>
  );
}
