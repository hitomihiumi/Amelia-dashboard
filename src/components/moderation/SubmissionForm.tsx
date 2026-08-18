"use client";

import React, { useMemo, useState } from "react";
import {
  Button,
  Column,
  Feedback,
  Input,
  NumberInput,
  Row,
  Switch,
  Text,
  Textarea,
  useToast,
} from "@once-ui-system/core";
import { SelectReact } from "@/components/user/SelectReact";
import type { ModerationFormField, ModerationSubmissionKind } from "@/lib/db/types";
import { submitForm } from "@/app/submit/[guildId]/actions";

export interface AppealableCase {
  id: string;
  caseNumber: number;
  type: string;
  reason: string;
  createdAt: string;
}

export interface SubmissionFormProps {
  guildId: string;
  kind: ModerationSubmissionKind;
  fields: ModerationFormField[];
  requireTarget: boolean;
  anonymous: boolean;
  cases?: AppealableCase[];
}

type FieldValue = string | number | boolean | null;

/**
 * Renders the fields an administrator configured in the dashboard and submits
 * them. All values are validated again on the server.
 */
export function SubmissionForm({
  guildId,
  kind,
  fields,
  requireTarget,
  anonymous,
  cases = [],
}: SubmissionFormProps) {
  const { addToast } = useToast();

  const [values, setValues] = useState<Record<string, FieldValue>>(() =>
    Object.fromEntries(fields.map((field) => [field.id, field.type === "boolean" ? false : ""])),
  );
  const [targetId, setTargetId] = useState("");
  const [caseId, setCaseId] = useState(cases[0]?.id ?? "");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const caseOptions = useMemo(
    () =>
      cases.map((entry) => ({
        value: entry.id,
        label: `#${entry.caseNumber} • ${entry.type} • ${new Date(
          entry.createdAt,
        ).toLocaleDateString()}`,
      })),
    [cases],
  );

  const update = (id: string, value: FieldValue) => setValues((prev) => ({ ...prev, [id]: value }));

  const handleSubmit = async () => {
    setPending(true);

    const result = await submitForm(guildId, kind, {
      answers: values,
      targetId: targetId.trim() || null,
      caseId: caseId || null,
    });

    setPending(false);

    if (result.ok) {
      setDone(result.message);
      return;
    }

    addToast({ variant: "danger", message: result.error });
  };

  if (done) {
    return <Feedback variant="success" title="Submitted" description={done} />;
  }

  return (
    <Column fillWidth gap="20">
      {anonymous && (
        <Feedback
          variant="info"
          title="Anonymous submission"
          description="Your name is hidden from the moderation channel. Moderators can still contact you about this submission."
        />
      )}

      {kind === "appeal" && cases.length > 0 && (
        <SelectReact
          id="appeal-case"
          label="Punishment you are appealing"
          options={caseOptions}
          value={caseId}
          onSelect={(value: string) => setCaseId(value)}
        />
      )}

      {kind === "report" && requireTarget && (
        <Input
          id="report-target"
          label="Discord ID of the reported user"
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
          description="Enable developer mode in Discord, right click the user and choose “Copy User ID”."
        />
      )}

      {fields.map((field) => (
        <FormField
          key={field.id}
          field={field}
          value={values[field.id]}
          onChange={(value) => update(field.id, value)}
        />
      ))}

      {fields.length === 0 && (
        <Feedback
          variant="warning"
          title="Nothing to fill in"
          description="This form has no fields configured yet. Please contact the server staff."
        />
      )}

      <Row fillWidth horizontal="end">
        <Button onClick={handleSubmit} loading={pending} disabled={pending}>
          Send
        </Button>
      </Row>
    </Column>
  );
}

function FormField({
  field,
  value,
  onChange,
}: {
  field: ModerationFormField;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
}) {
  const label = field.required ? `${field.label} *` : field.label;

  switch (field.type) {
    case "paragraph":
      return (
        <Textarea
          id={field.id}
          label={label}
          description={field.description ?? undefined}
          value={String(value ?? "")}
          lines={5}
          maxLength={field.max ?? 2000}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "number":
      return (
        <NumberInput
          id={field.id}
          label={label}
          description={field.description ?? undefined}
          value={typeof value === "number" ? value : undefined}
          min={field.min ?? undefined}
          max={field.max ?? undefined}
          onChange={(next: number) => onChange(next)}
        />
      );

    case "boolean":
      return (
        <Row fillWidth gap="12" vertical="center">
          <Switch isChecked={value === true} onToggle={() => onChange(!(value === true))} />
          <Column gap="4">
            <Text variant="label-default-s">{label}</Text>
            {field.description && (
              <Text variant="body-default-xs" onBackground="neutral-weak">
                {field.description}
              </Text>
            )}
          </Column>
        </Row>
      );

    case "select":
      return (
        <SelectReact
          id={field.id}
          label={label}
          description={field.description ?? undefined}
          options={field.options.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
          value={String(value ?? "")}
          onSelect={(next: string) => onChange(next)}
        />
      );

    default:
      return (
        <Input
          id={field.id}
          label={label}
          description={field.description ?? undefined}
          placeholder={field.placeholder ?? undefined}
          value={String(value ?? "")}
          maxLength={field.max ?? 1024}
          onChange={(e) => onChange(e.target.value)}
          validate={
            field.type === "url"
              ? validateLink
              : field.type === "message_link"
                ? validateMessageLink
                : undefined
          }
        />
      );
  }
}

const validateLink = (url: any) => {
  if (!url) return null;

  const urlRegex = /^https?:\/\/[^\s]+$/;
  if (!urlRegex.test(url)) {
    return "Please enter a valid URL";
  }

  return null;
};

const validateMessageLink = (url: any) => {
  if (!url) return null;

  const urlRegex = /^https?:\/\/(canary|ptb)?\.?discord\.com\/channels\/\d+\/\d+\/\d+$/;
  if (!urlRegex.test(url)) {
    return "Please enter a valid message link";
  }

  return null;
};
