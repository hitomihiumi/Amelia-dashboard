"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import classNames from "classnames";
import { Button, Column, Grid, IconButton, Input, Line, Row, Tag, Text } from "@once-ui-system/core";
import {
  IoCheckmark,
  IoChatbubbleEllipsesOutline,
  IoHourglassOutline,
  IoTimeOutline,
} from "react-icons/io5";
import { AdminCard } from "@/components/admin/AdminPage";
import { ConfirmIconButton } from "@/components/dashboard/ConfirmIconButton";
import { useT } from "@/i18n/client";
import {
  effectiveStatus,
  INCIDENT_STATUSES,
  type IncidentComponent,
  type IncidentSeverity,
  type IncidentStatus,
  type IncidentView,
  isIncidentComponent,
  isIncidentStatus,
  isSeverity,
  localizeAutoIncident,
  severityTone,
  STATUS_TONE,
  toMs,
} from "@/components/status/incidentMeta";
import { useStableFormat } from "@/components/status/useStableFormat";
import tones from "@/components/status/tones.module.scss";
import {
  AutoBadge,
  CharCounter,
  ComponentPicker,
  formatDuration,
  relativeAgo,
  SeverityPicker,
  STATUS_ICON,
  StatusChip,
  useIncidentLabels,
  useNow,
} from "./incidentUi";
import { IncidentTimeline } from "./IncidentTimeline";
import { MESSAGE_FIELD_ID, UpdateComposer } from "./UpdateComposer";
import { type IncidentActions, INCIDENTS_PATH, TITLE_MAX } from "./types";
import { useActionRunner } from "./useActionRunner";
import styles from "./IncidentDetail.module.scss";

interface IncidentDetailProps {
  incident: IncidentView;
  /** Server time the page was rendered at, so relative times match during hydration. */
  now: number;
  actions: IncidentActions;
  basePath?: string;
  /** Where the public page lives, for the "view" link. */
  statusPath?: string;
}

/** The step an admin most likely wants to post next. */
function nextStatus(status: IncidentStatus): IncidentStatus {
  switch (status) {
    case "investigating":
      return "identified";
    case "identified":
    case "monitoring":
      return "monitoring";
    default:
      return "investigating";
  }
}

export function IncidentDetail({
  incident,
  now: serverNow,
  actions,
  basePath = INCIDENTS_PATH,
  statusPath = "/status",
}: IncidentDetailProps) {
  const t = useT();
  const router = useRouter();
  const format = useStableFormat();
  const labels = useIncidentLabels();
  const now = useNow(serverNow);
  const { run, pending } = useActionRunner();

  const currentRaw = effectiveStatus(incident);
  const current: IncidentStatus = isIncidentStatus(currentRaw) ? currentRaw : "investigating";
  const resolved = current === "resolved";

  const shown = localizeAutoIncident(t, incident);

  // --- composer -----------------------------------------------------------
  const [status, setStatus] = useState<IncidentStatus>(nextStatus(current));
  const [body, setBody] = useState("");

  const post = async () => {
    const result = await run(
      () => actions.addIncidentUpdate({ incidentId: incident.id, status, body }),
      t(status === "resolved" ? "adminIncidents.toast.resolved" : "adminIncidents.toast.updatePosted"),
    );
    if (result?.ok) {
      setBody("");
      setStatus(nextStatus(status));
    }
  };

  const resolve = async () => {
    const message = body.trim() || t("adminIncidents.templates.update.resolved.a.text");
    const result = await run(
      () => actions.addIncidentUpdate({ incidentId: incident.id, status: "resolved", body: message }),
      t("adminIncidents.toast.resolved"),
    );
    if (result?.ok) {
      setBody("");
      setStatus("investigating");
    }
  };

  const reopen = () => {
    setStatus("investigating");
    setBody(t("adminIncidents.templates.reopened"));

    requestAnimationFrame(() => {
      const field = document.getElementById(MESSAGE_FIELD_ID);
      field?.scrollIntoView({ block: "center", behavior: "smooth" });
      field?.focus({ preventScroll: true });
    });
  };

  // --- header editing -----------------------------------------------------
  const [editing, setEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(incident.title);
  const [draftSeverity, setDraftSeverity] = useState<IncidentSeverity>(
    isSeverity(incident.severity) ? incident.severity : "minor",
  );
  const [draftComponent, setDraftComponent] = useState<IncidentComponent | "">(
    incident.component && isIncidentComponent(incident.component) ? incident.component : "",
  );

  const startEditing = () => {
    setDraftTitle(incident.title);
    setDraftSeverity(isSeverity(incident.severity) ? incident.severity : "minor");
    setDraftComponent(
      incident.component && isIncidentComponent(incident.component) ? incident.component : "",
    );
    setEditing(true);
  };

  const saveDetails = async () => {
    const result = await run(
      () =>
        actions.updateIncident({
          id: incident.id,
          title: draftTitle,
          severity: draftSeverity,
          component: draftComponent,
        }),
      t("adminIncidents.toast.detailsSaved"),
    );
    if (result?.ok) setEditing(false);
  };

  const removeIncident = async () => {
    const result = await run(
      () => actions.deleteIncident(incident.id),
      t("adminIncidents.toast.deleted"),
      { refresh: false },
    );
    if (result?.ok) router.push(basePath);
  };

  const titleValid = draftTitle.trim().length >= 3 && draftTitle.length <= TITLE_MAX;
  const durationMs = (incident.resolvedAt ? toMs(incident.resolvedAt) : now) - toMs(incident.startedAt);

  return (
    <>
      <Column fillWidth gap="24">
        <Row fillWidth horizontal="between" vertical="center" gap="16" wrap>
          <Button href={basePath} variant="tertiary" size="m" prefixIcon="arrowLeft">
            {t("adminIncidents.detail.back")}
          </Button>
          <Row wrap vertical="center" horizontal="end" gap="8" fitWidth>
            {resolved ? (
              <Button size="m" variant="secondary" prefixIcon="refresh" onClick={reopen}>
                {t("adminIncidents.detail.composer.reopen")}
              </Button>
            ) : (
              <Button
                size="m"
                variant="success"
                prefixIcon="check"
                onClick={resolve}
                disabled={pending}
              >
                {t("adminIncidents.detail.composer.resolve")}
              </Button>
            )}
            <Button
              size="m"
              variant="secondary"
              suffixIcon="arrowUpRight"
              href={statusPath}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("adminIncidents.detail.viewOnStatus")}
            </Button>
          </Row>
        </Row>

        <Grid fillWidth className={styles.layout}>
          <Column fillWidth className={styles.main}>
            <Column fillWidth className={styles.orderHeader}>
              <Column
                as="header"
                fillWidth
                gap="20"
                padding="24"
                radius="l"
                border="neutral-medium"
                background="surface"
                overflow="hidden"
                className={classNames(styles.header, tones[severityTone(incident.severity)])}
              >
                {editing ? (
                  <Column fillWidth gap="20">
                    <Column fillWidth>
                      <Input
                        id="incident-edit-title"
                        label={t("adminIncidents.detail.titleLabel")}
                        value={draftTitle}
                        maxLength={TITLE_MAX}
                        autoFocus
                        autoComplete="off"
                        onChange={(event) => setDraftTitle(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") setEditing(false);
                          if (event.key === "Enter" && titleValid && !pending) {
                            event.preventDefault();
                            void saveDetails();
                          }
                        }}
                      />
                      <Row fillWidth horizontal="end" marginTop="4">
                        <CharCounter count={draftTitle.length} max={TITLE_MAX} />
                      </Row>
                    </Column>

                    <Column gap="8">
                      <Text variant="label-default-s" onBackground="neutral-weak">
                        {t("adminIncidents.form.severity")}
                      </Text>
                      <SeverityPicker value={draftSeverity} onChange={setDraftSeverity} compact />
                    </Column>

                    <Column gap="8">
                      <Text variant="label-default-s" onBackground="neutral-weak">
                        {t("adminIncidents.form.component")}
                      </Text>
                      <ComponentPicker
                        value={draftComponent}
                        onChange={setDraftComponent}
                        disabled={incident.auto}
                      />
                      {incident.auto && (
                        <Text variant="body-default-xs" onBackground="neutral-weak">
                          {t("adminIncidents.detail.autoComponentLocked")}
                        </Text>
                      )}
                    </Column>

                    <Row fillWidth wrap vertical="center" horizontal="end" gap="8">
                      <Button variant="tertiary" onClick={() => setEditing(false)} disabled={pending}>
                        {t("common.actions.cancel")}
                      </Button>
                      <Button onClick={saveDetails} loading={pending} disabled={!titleValid || pending}>
                        {t("adminIncidents.detail.saveDetails")}
                      </Button>
                    </Row>
                  </Column>
                ) : (
                  <>
                    <Row fillWidth vertical="start" horizontal="between" gap="12">
                      <Text
                        variant="heading-strong-l"
                        as="h1"
                        style={{ minWidth: 0, overflowWrap: "anywhere" }}
                      >
                        {shown.title}
                      </Text>
                      <IconButton
                        icon="edit"
                        variant="ghost"
                        tooltip={t("adminIncidents.detail.editDetails")}
                        aria-label={t("adminIncidents.detail.editDetails")}
                        onClick={startEditing}
                      />
                    </Row>

                    <Row fillWidth wrap vertical="center" gap="8">
                      <Tag scheme={severityTone(incident.severity)}>{labels.severity(incident.severity)}</Tag>
                      <StatusChip status={current} ongoing={!resolved} />
                      {incident.component && (
                        <Tag scheme="neutral">{labels.component(incident.component)}</Tag>
                      )}
                      {incident.auto && <AutoBadge />}
                    </Row>

                    <Row
                      fillWidth
                      wrap
                      vertical="center"
                      gap="4"
                      textVariant="body-default-s"
                      onBackground="neutral-weak"
                      style={{ columnGap: "var(--static-space-20)" }}
                    >
                      <Row
                        fitWidth
                        vertical="center"
                        gap="8"
                        title={format.dateTime(incident.startedAt, { dateStyle: "long", timeStyle: "short" })}
                      >
                        <IoTimeOutline aria-hidden />
                        {t("adminIncidents.meta.started", {
                          time: relativeAgo(format, incident.startedAt, now),
                        })}
                        <Text as="span" aria-hidden>
                          ·
                        </Text>
                        {format.dateTime(incident.startedAt)}
                      </Row>
                      <Row fitWidth vertical="center" gap="8">
                        <IoHourglassOutline aria-hidden />
                        {t(resolved ? "adminIncidents.meta.lasted" : "adminIncidents.meta.ongoing", {
                          duration: formatDuration(t, durationMs),
                        })}
                      </Row>
                      <Row fitWidth vertical="center" gap="8">
                        <IoChatbubbleEllipsesOutline aria-hidden />
                        {incident.updates.length > 0
                          ? t("adminIncidents.list.updates", { count: incident.updates.length })
                          : t("adminIncidents.list.noUpdates")}
                      </Row>
                    </Row>
                  </>
                )}

                <Line background="neutral-alpha-weak" />
                <ProgressStepper current={current} label={t("adminIncidents.detail.progressLabel")} />
              </Column>
            </Column>

            <Column fillWidth className={styles.orderTimeline}>
              <IncidentTimeline
                incident={incident}
                now={now}
                actions={actions}
                run={run}
                pending={pending}
              />
            </Column>

            <Column fillWidth className={styles.orderDanger}>
              <AdminCard padding="20" gap="16">
                <Row fillWidth wrap vertical="center" horizontal="between" gap="12">
                  <Column flex={1} gap="2" style={{ minWidth: 0 }}>
                    <Text variant="heading-strong-s" as="h2">
                      {t("adminIncidents.detail.danger.title")}
                    </Text>
                    <Text variant="body-default-xs" onBackground="neutral-weak">
                      {t("adminIncidents.detail.danger.text")}
                    </Text>
                  </Column>
                  <ConfirmIconButton
                    variant="confirm"
                    tooltip={t("adminIncidents.detail.danger.title")}
                    onConfirm={() => void removeIncident()}
                  />
                </Row>
              </AdminCard>
            </Column>
          </Column>

          <Column fillWidth className={styles.aside}>
            <Column fillWidth className={styles.composerSticky}>
              <UpdateComposer
                status={status}
                body={body}
                onStatusChange={setStatus}
                onBodyChange={setBody}
                onPost={post}
                onResolve={resolve}
                onReopen={reopen}
                pending={pending}
                resolved={resolved}
                resolvedAgo={incident.resolvedAt ? relativeAgo(format, incident.resolvedAt, now) : null}
                auto={incident.auto}
              />
            </Column>
          </Column>
        </Grid>
      </Column>
    </>
  );
}

function ProgressStepper({ current, label }: { current: IncidentStatus; label: string }) {
  const labels = useIncidentLabels();
  const currentIndex = INCIDENT_STATUSES.indexOf(current);

  return (
    <Row as="ol" fillWidth margin="0" padding="0" aria-label={label}>
      {INCIDENT_STATUSES.map((step, index) => {
        const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "todo";

        return (
          <Column
            as="li"
            key={step}
            flex={1}
            horizontal="center"
            gap="8"
            aria-current={state === "current" ? "step" : undefined}
            className={classNames(
              styles.step,
              tones[STATUS_TONE[step]],
              state === "done" && styles.stepDone,
              state === "current" && styles.stepCurrent,
              step === "resolved" && styles.stepFinal,
            )}
            style={{ minWidth: 0, textAlign: "center" }}
          >
            <Row
              center
              width={2.25}
              height={2.25}
              radius="full"
              border="neutral-alpha-strong"
              borderWidth={2}
              background="surface"
              onBackground="neutral-weak"
              aria-hidden
              className={styles.stepMarker}
            >
              {state === "done" || (state === "current" && step === "resolved") ? (
                <IoCheckmark />
              ) : (
                STATUS_ICON[step]
              )}
            </Row>
            <Text variant="label-default-s" onBackground="neutral-weak" truncate className={styles.stepLabel}>
              {labels.status(step)}
            </Text>
          </Column>
        );
      })}
    </Row>
  );
}
