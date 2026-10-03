"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Column, Input, Row, Text, Textarea, useToast } from "@once-ui-system/core";
import { AdminCard } from "@/components/admin/AdminPage";
import { IncidentCard } from "@/components/status/IncidentCard";
import type { IncidentComponent, IncidentSeverity } from "@/components/status/incidentMeta";
import { useT } from "@/i18n/client";
import {
  applyTemplate,
  CharCounter,
  ComponentPicker,
  SeverityPicker,
  TemplateChips,
} from "./incidentUi";
import { BODY_MAX, type IncidentActions, INCIDENTS_PATH, TITLE_MAX } from "./types";
import styles from "./IncidentForm.module.scss";

interface IncidentFormProps {
  actions: Pick<IncidentActions, "createIncident">;
  /** Where incident pages live; the new incident is opened there. */
  basePath?: string;
}

/** Situations that come with a sensible severity, so one click sets up most of the form. */
const CREATE_TEMPLATES = [
  { key: "investigating", severity: null },
  { key: "degraded", severity: "major" },
  { key: "outage", severity: "critical" },
  { key: "maintenance", severity: "maintenance" },
] as const;

export function IncidentForm({ actions, basePath = INCIDENTS_PATH }: IncidentFormProps) {
  const t = useT();
  const router = useRouter();
  const { addToast } = useToast();

  const [severity, setSeverity] = useState<IncidentSeverity>("minor");
  const [component, setComponent] = useState<IncidentComponent | "">("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [startedAt] = useState(() => new Date());

  const trimmedTitle = title.trim();
  const trimmedBody = body.trim();
  const canSubmit = trimmedTitle.length >= 3 && title.length <= TITLE_MAX && body.length <= BODY_MAX;

  const templates = CREATE_TEMPLATES.map((template) => ({
    key: template.key,
    label: t(`adminIncidents.templates.create.${template.key}.label`),
    text: t(`adminIncidents.templates.create.${template.key}.text`),
    severity: template.severity,
  }));

  const submit = async () => {
    if (!canSubmit || pending) return;
    setPending(true);

    const result = await actions.createIncident({
      title: trimmedTitle,
      body: trimmedBody,
      severity,
      component,
    });

    if (result.ok && result.id) {
      addToast({ message: t("adminIncidents.toast.created"), variant: "success" });
      router.push(`${basePath}/${result.id}`);
      return;
    }

    setPending(false);
    addToast({
      message: result.ok ? t("adminIncidents.errors.createFailed") : result.error,
      variant: "danger",
    });
  };

  const previewIncident = useMemo(
    () => ({
      title: trimmedTitle || t("adminIncidents.form.previewPlaceholder"),
      body: trimmedBody || null,
      severity,
      status: "investigating",
      component: component || null,
      startedAt,
      resolvedAt: null,
    }),
    [trimmedTitle, trimmedBody, severity, component, startedAt, t],
  );

  const previewUpdates = useMemo(
    () =>
      trimmedBody
        ? [{ id: "preview", status: "investigating", body: trimmedBody, createdAt: startedAt }]
        : [],
    [trimmedBody, startedAt],
  );

  return (
    <div className={styles.layout}>
      <AdminCard padding="24" gap="24">
        <Column gap="12">
          <Text variant="label-default-s" onBackground="neutral-weak">
            {t("adminIncidents.form.severity")}
          </Text>
          <SeverityPicker value={severity} onChange={setSeverity} />
        </Column>

        <Column gap="12">
          <Text variant="label-default-s" onBackground="neutral-weak">
            {t("adminIncidents.form.component")}
          </Text>
          <ComponentPicker value={component} onChange={setComponent} />
        </Column>

        <Column gap="4">
          <Input
            id="incident-title"
            label={t("adminIncidents.form.titleLabel")}
            placeholder={t("adminIncidents.form.titlePlaceholder")}
            value={title}
            maxLength={TITLE_MAX}
            autoComplete="off"
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void submit();
              }
            }}
          />
          <div className={styles.fieldFoot}>
            <span />
            <CharCounter count={title.length} max={TITLE_MAX} />
          </div>
        </Column>

        <Column gap="12">
          <Column gap="4">
            <Textarea
              id="incident-message"
              label={t("adminIncidents.form.messageLabel")}
              placeholder={t("adminIncidents.form.messagePlaceholder")}
              lines={6}
              value={body}
              maxLength={BODY_MAX}
              onChange={(event) => setBody(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  void submit();
                }
              }}
            />
            <div className={styles.fieldFoot}>
              <Text variant="body-default-xs" onBackground="neutral-weak">
                {t("adminIncidents.form.messageHint")}
              </Text>
              <CharCounter count={body.length} max={BODY_MAX} />
            </div>
          </Column>

          <TemplateChips
            label={t("adminIncidents.form.templates")}
            templates={templates}
            onPick={(key) => {
              const template = templates.find((item) => item.key === key);
              if (!template) return;
              setBody((current) => applyTemplate(current, template.text, BODY_MAX));
              if (template.severity) setSeverity(template.severity);
            }}
          />
        </Column>

        <div className={styles.actions}>
          <Button variant="tertiary" href={basePath}>
            {t("common.actions.cancel")}
          </Button>
          <Button onClick={submit} loading={pending} disabled={!canSubmit || pending}>
            {t("adminIncidents.form.submit")}
          </Button>
        </div>
      </AdminCard>

      <div className={styles.preview}>
        <AdminCard padding="20" gap="16">
          <Row fillWidth horizontal="between" vertical="center" gap="12" wrap>
            <Column gap="2">
              <Text variant="heading-strong-s">{t("adminIncidents.form.previewTitle")}</Text>
              <Text variant="body-default-xs" onBackground="neutral-weak">
                {t("adminIncidents.form.previewHint")}
              </Text>
            </Column>
            <span className={styles.previewBadge}>
              <span aria-hidden className={styles.previewDot} />
              /status
            </span>
          </Row>

          <div className={styles.previewFrame}>
            <Text variant="heading-strong-m">{t("site.status.history.title")}</Text>
            <IncidentCard
              incident={previewIncident}
              updates={previewUpdates}
              titleMuted={!trimmedTitle}
            />
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
