"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import classNames from "classnames";
import { Button, Flex, IconButton, Input, Tag, Text } from "@once-ui-system/core";
import {
  IoArrowBack,
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
      <Flex direction="column" fillWidth gap="24" style={{ minWidth: 0 }}>
        <Flex fillWidth horizontal="between" vertical="center" gap="16" wrap>
          <Link href={basePath} className={styles.backLink}>
            <IoArrowBack aria-hidden />
            {t("adminIncidents.detail.back")}
          </Link>
          <div className={styles.buttons}>
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
          </div>
        </Flex>

        <div className={styles.layout}>
          <div className={styles.main}>
            <div className={styles.orderHeader}>
                <Flex
                  as="header"
                  direction="column"
                  fillWidth
                  gap="20"
                  padding="24"
                  radius="l"
                  border="neutral-medium"
                  background="surface"
                  className={classNames(styles.header, tones[severityTone(incident.severity)])}
                >
                  {editing ? (
                    <div className={styles.editGrid}>
                      <div>
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
                        <div className={styles.fieldFoot}>
                          <CharCounter count={draftTitle.length} max={TITLE_MAX} />
                        </div>
                      </div>

                      <Flex direction="column" gap="8">
                        <Text variant="label-default-s" onBackground="neutral-weak">
                          {t("adminIncidents.form.severity")}
                        </Text>
                        <SeverityPicker value={draftSeverity} onChange={setDraftSeverity} compact />
                      </Flex>

                      <Flex direction="column" gap="8">
                        <Text variant="label-default-s" onBackground="neutral-weak">
                          {t("adminIncidents.form.component")}
                        </Text>
                        <ComponentPicker
                          value={draftComponent}
                          onChange={setDraftComponent}
                          disabled={incident.auto}
                        />
                        {incident.auto && (
                          <span className={styles.hint}>{t("adminIncidents.detail.autoComponentLocked")}</span>
                        )}
                      </Flex>

                      <div className={styles.buttons}>
                        <Button variant="tertiary" onClick={() => setEditing(false)} disabled={pending}>
                          {t("common.actions.cancel")}
                        </Button>
                        <Button
                          onClick={saveDetails}
                          loading={pending}
                          disabled={!titleValid || pending}
                        >
                          {t("adminIncidents.detail.saveDetails")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={styles.titleRow}>
                        <Text variant="heading-strong-l" as="h1" className={styles.title}>
                          {shown.title}
                        </Text>
                        <IconButton
                          icon="edit"
                          variant="ghost"
                          tooltip={t("adminIncidents.detail.editDetails")}
                          aria-label={t("adminIncidents.detail.editDetails")}
                          onClick={startEditing}
                        />
                      </div>

                      <div className={styles.badges}>
                        <Tag scheme={severityTone(incident.severity)}>{labels.severity(incident.severity)}</Tag>
                        <StatusChip status={current} ongoing={!resolved} />
                        {incident.component && (
                          <Tag scheme="neutral">{labels.component(incident.component)}</Tag>
                        )}
                        {incident.auto && <AutoBadge />}
                      </div>

                      <div className={styles.meta}>
                        <span
                          className={styles.metaItem}
                          title={format.dateTime(incident.startedAt, { dateStyle: "long", timeStyle: "short" })}
                        >
                          <IoTimeOutline aria-hidden />
                          {t("adminIncidents.meta.started", {
                            time: relativeAgo(format, incident.startedAt, now),
                          })}
                          <span aria-hidden>·</span>
                          {format.dateTime(incident.startedAt)}
                        </span>
                        <span className={styles.metaItem}>
                          <IoHourglassOutline aria-hidden />
                          {t(resolved ? "adminIncidents.meta.lasted" : "adminIncidents.meta.ongoing", {
                            duration: formatDuration(t, durationMs),
                          })}
                        </span>
                        <span className={styles.metaItem}>
                          <IoChatbubbleEllipsesOutline aria-hidden />
                          {incident.updates.length > 0
                            ? t("adminIncidents.list.updates", { count: incident.updates.length })
                            : t("adminIncidents.list.noUpdates")}
                        </span>
                      </div>
                    </>
                  )}

                  <div className={styles.divider} />
                  <ProgressStepper current={current} label={t("adminIncidents.detail.progressLabel")} />
                </Flex>
            </div>

            <div className={styles.orderTimeline}>
              <IncidentTimeline
                incident={incident}
                now={now}
                actions={actions}
                run={run}
                pending={pending}
              />
            </div>

            <div className={styles.orderDanger}>
            <AdminCard padding="20" gap="16">
              <div className={styles.dangerRow}>
                <Flex direction="column" gap="2" style={{ minWidth: 0, flex: 1 }}>
                  <Text variant="heading-strong-s" as="h2">
                    {t("adminIncidents.detail.danger.title")}
                  </Text>
                  <Text variant="body-default-xs" onBackground="neutral-weak">
                    {t("adminIncidents.detail.danger.text")}
                  </Text>
                </Flex>
                <ConfirmIconButton
                  variant="confirm"
                  tooltip={t("adminIncidents.detail.danger.title")}
                  onConfirm={() => void removeIncident()}
                />
              </div>
            </AdminCard>
            </div>
          </div>

          <div className={styles.aside}>
            <div className={styles.composerSticky}>
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
            </div>
          </div>
        </div>
      </Flex>
    </>
  );
}

function ProgressStepper({ current, label }: { current: IncidentStatus; label: string }) {
  const labels = useIncidentLabels();
  const currentIndex = INCIDENT_STATUSES.indexOf(current);

  return (
    <ol className={styles.stepper} aria-label={label}>
      {INCIDENT_STATUSES.map((step, index) => {
        const state = index < currentIndex ? "done" : index === currentIndex ? "current" : "todo";

        return (
          <li
            key={step}
            aria-current={state === "current" ? "step" : undefined}
            className={classNames(
              styles.step,
              tones[STATUS_TONE[step]],
              state === "done" && styles.stepDone,
              state === "current" && styles.stepCurrent,
              step === "resolved" && styles.stepFinal,
            )}
          >
            <span aria-hidden className={styles.stepMarker}>
              {state === "done" || (state === "current" && step === "resolved") ? (
                <IoCheckmark />
              ) : (
                STATUS_ICON[step]
              )}
            </span>
            <span className={styles.stepLabel}>{labels.status(step)}</span>
          </li>
        );
      })}
    </ol>
  );
}
