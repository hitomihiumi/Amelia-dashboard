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
import type { ModerationForm, ModerationFormField, ModerationFormFieldType } from "@/lib/db/types";
import type { GuildActionState } from "@/types/dashboard";
import { updateModerationForms } from "../actions";
import { Section } from "@/components/dashboard/Section";
import { IconName } from "@/resources/icons";

const FIELD_TYPES: { value: ModerationFormFieldType; label: string }[] = [
  { value: "short", label: "Short text" },
  { value: "paragraph", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Yes / no" },
  { value: "select", label: "Choice" },
  { value: "user", label: "User ID" },
  { value: "channel", label: "Channel ID" },
  { value: "message_link", label: "Message link" },
  { value: "url", label: "Link" },
];

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
  const router = useRouter();
  const { addToast } = useToast();
  const { setIsDirty, setSaveAction, setCancelAction } = useUnsavedChanges();

  const [report, setReport] = useState(defaultReport);
  const [appeal, setAppeal] = useState(defaultAppeal);
  const [baseline, setBaseline] = useState({ report: defaultReport, appeal: defaultAppeal });

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
      addToast({ message: "Forms saved", variant: "success" });
      router.refresh();
    } else {
      addToast({ message: result?.error || "Save failed", variant: "danger" });
    }
  }, [guildId, report, appeal, router, addToast]);

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
    <Column fillWidth gap="24">
      <FormEditor
        title="Report form"
        description="Members use this form to report rule violations."
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
        title="Appeal form"
        description="Punished members use this form to ask for a review. Banned users can reach it too."
        publicUrl={`${baseUrl}/submit/${guildId}/appeal`}
        guildId={guildId}
        form={appeal}
        onChange={setAppeal}
        channelOptions={channelOptions}
        kind="appeal"
        num={2}
        icon="refresh"
      />
    </Column>
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
  const update = (patch: Partial<ModerationForm>) => onChange({ ...form, ...patch });

  const addField = () => {
    const field: ModerationFormField = {
      id: generateID(guildId, "field"),
      label: "New question",
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
      fields: form.fields.map((field, i) => (i === index ? { ...field, ...patch } : field)),
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
        <Switch isChecked={form.enabled} onToggle={() => update({ enabled: !form.enabled })} />
      }
    >
      <Text variant="body-default-s" onBackground="neutral-weak">
        Public link: {publicUrl}
      </Text>

      <ChannelSelect
        fillWidth
        id={`${kind}-channel`}
        label="Submissions are posted to"
        options={channelOptions}
        selectedChannel={form.channel ?? ""}
        setSelectedChannel={(value) => update({ channel: (value as string) || null })}
      />

      <Row fillWidth gap="12" wrap>
        <NumberInput
          id={`${kind}-cooldown`}
          label="Cooldown between submissions (seconds)"
          value={form.cooldown}
          min={0}
          max={2592000}
          onChange={(value: number) => update({ cooldown: Number(value) || 0 })}
        />
        <NumberInput
          id={`${kind}-max-pending`}
          label="Open submissions per member"
          value={form.max_pending}
          min={1}
          max={20}
          onChange={(value: number) => update({ max_pending: Number(value) || 1 })}
        />
      </Row>

      {kind === "report" && (
        <>
          <Row fillWidth gap="12" vertical="center">
            <Switch
              isChecked={form.require_target}
              onToggle={() => update({ require_target: !form.require_target })}
            />
            <Text variant="label-default-s">Require the reported user's ID</Text>
          </Row>
          <Row fillWidth gap="12" vertical="center">
            <Switch
              isChecked={form.allow_anonymous}
              onToggle={() => update({ allow_anonymous: !form.allow_anonymous })}
            />
            <Column gap="4">
              <Text variant="label-default-s">Hide the author in Discord</Text>
              <Text variant="body-default-xs" onBackground="neutral-weak">
                The author is still stored and visible in the dashboard queue.
              </Text>
            </Column>
          </Row>
        </>
      )}

      {kind === "appeal" && (
        <Row fillWidth gap="12" vertical="center">
          <Switch
            isChecked={form.allow_banned}
            onToggle={() => update({ allow_banned: !form.allow_banned })}
          />
          <Text variant="label-default-s">Banned users may appeal</Text>
        </Row>
      )}

      <Line />

      <Row fillWidth horizontal="between" vertical="center" gap="8">
        <Text variant="label-default-s">Questions ({form.fields.length}/15)</Text>
        <Button prefixIcon="plus" onClick={addField} disabled={form.fields.length >= 15}>
          Add question
        </Button>
      </Row>

      {form.fields.length === 0 && (
        <Text variant="body-default-s" onBackground="neutral-weak">
          No questions yet. Members would only see the built-in fields.
        </Text>
      )}

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

      <Line />

      <Textarea
        id={`${kind}-success`}
        label="Confirmation shown after sending"
        lines={2}
        value={form.success_message ?? ""}
        onChange={(e) => update({ success_message: e.target.value || null })}
      />
      <Textarea
        id={`${kind}-approve`}
        label="Message sent when approved"
        lines={2}
        value={form.approve_message ?? ""}
        onChange={(e) => update({ approve_message: e.target.value || null })}
      />
      <Textarea
        id={`${kind}-reject`}
        label="Message sent when rejected"
        lines={2}
        value={form.reject_message ?? ""}
        onChange={(e) => update({ reject_message: e.target.value || null })}
      />
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
  const addOption = () =>
    onChange({
      options: [
        ...field.options,
        {
          id: generateID(guildId, "opt"),
          label: "New option",
          value: `option_${field.options.length + 1}`,
        },
      ],
    });

  return (
    <Column fillWidth gap="16">
      <Input
        id={`${field.id}-label`}
        label="Question"
        value={field.label}
        maxLength={100}
        onChange={(e) => onChange({ label: e.target.value })}
      />

      <Input
        id={`${field.id}-description`}
        label="Hint (optional)"
        value={field.description ?? ""}
        maxLength={200}
        onChange={(e) => onChange({ description: e.target.value || null })}
      />

      <SegmentedControl
        fillWidth
        buttons={FIELD_TYPES.map((type) => ({ value: type.value, label: type.label }))}
        selected={field.type}
        onToggle={(value) => onChange({ type: value as ModerationFormFieldType })}
      />

      {(field.type === "short" || field.type === "paragraph" || field.type === "number") && (
        <Row fillWidth gap="12" wrap>
          <NumberInput
            id={`${field.id}-min`}
            label={field.type === "number" ? "Minimum value" : "Minimum length"}
            value={field.min ?? 0}
            min={0}
            onChange={(value: number) => onChange({ min: Number(value) || null })}
          />
          <NumberInput
            id={`${field.id}-max`}
            label={field.type === "number" ? "Maximum value" : "Maximum length"}
            value={field.max ?? 0}
            min={0}
            onChange={(value: number) => onChange({ max: Number(value) || null })}
          />
        </Row>
      )}

      {field.type !== "boolean" && field.type !== "select" && (
        <Input
          id={`${field.id}-placeholder`}
          label="Placeholder"
          value={field.placeholder ?? ""}
          maxLength={100}
          onChange={(e) => onChange({ placeholder: e.target.value || null })}
        />
      )}

      {field.type === "select" && (
        <Column fillWidth gap="8">
          <Row fillWidth horizontal="between" vertical="center">
            <Text variant="label-default-s">Options ({field.options.length}/25)</Text>
            <Button
              size="s"
              prefixIcon="plus"
              variant="secondary"
              onClick={addOption}
              disabled={field.options.length >= 25}
            >
              Add option
            </Button>
          </Row>

          {field.options.map((option, i) => (
            <Row key={option.id} fillWidth gap="8" vertical="center">
              <Input
                id={`${option.id}-label`}
                label="Label"
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
                label="Value"
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
                  onChange({ options: field.options.filter((_, index) => index !== i) })
                }
              />
            </Row>
          ))}
        </Column>
      )}

      <Row fillWidth gap="8" horizontal="between" vertical="center">
        <Switch
          label="Required"
          isChecked={field.required}
          onToggle={() => onChange({ required: !field.required })}
        />
        <Row gap="8" vertical="center">
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
          <IconButton icon="trash" variant="danger" onClick={onDelete} tooltip="Delete question" />
        </Row>
      </Row>
    </Column>
  );
}
