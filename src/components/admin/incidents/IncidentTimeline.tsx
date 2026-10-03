"use client";

import React, { useState } from "react";
import classNames from "classnames";
import { Button, IconButton, Text, Textarea } from "@once-ui-system/core";
import { AdminCard } from "@/components/admin/AdminPage";
import { ConfirmIconButton } from "@/components/dashboard/ConfirmIconButton";
import { useT } from "@/i18n/client";
import {
  type IncidentStatus,
  type IncidentUpdateView,
  type IncidentView,
  isIncidentStatus,
  isSeverity,
  localizeAutoUpdate,
  severityTone,
  statusTone,
  toMs,
} from "@/components/status/incidentMeta";
import { useStableFormat } from "@/components/status/useStableFormat";
import tones from "@/components/status/tones.module.scss";
import {
  CharCounter,
  relativeAgo,
  SEVERITY_ICON,
  STATUS_ICON,
  StatusChip,
  StatusPicker,
} from "./incidentUi";
import { BODY_MAX, type IncidentActions } from "./types";
import type { useActionRunner } from "./useActionRunner";
import styles from "./IncidentDetail.module.scss";

interface IncidentTimelineProps {
  incident: IncidentView;
  now: number;
  actions: Pick<IncidentActions, "editIncidentUpdate" | "deleteIncidentUpdate">;
  run: ReturnType<typeof useActionRunner>["run"];
  pending: boolean;
}

export function IncidentTimeline({ incident, now, actions, run, pending }: IncidentTimelineProps) {
  const t = useT();
  const format = useStableFormat();
  const [editingId, setEditingId] = useState<string | null>(null);

  // Newest first: that is the part an admin cares about.
  const updates = [...incident.updates].sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));

  const absolute = (value: Date | string) => format.dateTime(value);

  return (
    <AdminCard padding="24" gap="24">
      <Text variant="heading-strong-m" as="h2">
        {t("adminIncidents.detail.timeline.title")}
      </Text>

      {updates.length === 0 && (
        <p className={styles.empty}>{t("adminIncidents.detail.timeline.empty")}</p>
      )}

      <ol className={styles.timeline}>
        {updates.map((update) => (
          <li key={update.id} className={classNames(styles.entry, tones[statusTone(update.status)])}>
            <div className={styles.rail}>
              <span aria-hidden className={styles.dot}>
                {isIncidentStatus(update.status) ? STATUS_ICON[update.status] : null}
              </span>
              <span aria-hidden className={styles.line} />
            </div>

            <div className={styles.entryContent}>
              {editingId === update.id ? (
                <UpdateEditor
                  update={update}
                  incident={incident}
                  pending={pending}
                  onCancel={() => setEditingId(null)}
                  onSave={async (status, body) => {
                    const result = await run(
                      () => actions.editIncidentUpdate({ id: update.id, status, body }),
                      t("adminIncidents.toast.updateEdited"),
                    );
                    if (result?.ok) setEditingId(null);
                  }}
                />
              ) : (
                <>
                  <div className={styles.entryHead}>
                    <StatusChip status={update.status} />
                    <span className={styles.time} title={absolute(update.createdAt)}>
                      {relativeAgo(format, update.createdAt, now)} · {absolute(update.createdAt)}
                    </span>
                    <span className={styles.entryActions}>
                      <IconButton
                        icon="edit"
                        variant="ghost"
                        size="s"
                        tooltip={t("adminIncidents.detail.timeline.edit")}
                        aria-label={t("adminIncidents.detail.timeline.edit")}
                        onClick={() => setEditingId(update.id)}
                      />
                      <ConfirmIconButton
                        variant="confirm"
                        tooltip={t("adminIncidents.detail.timeline.delete")}
                        onConfirm={() =>
                          void run(
                            () => actions.deleteIncidentUpdate(update.id),
                            t("adminIncidents.toast.updateDeleted"),
                          )
                        }
                      />
                    </span>
                  </div>
                  <p className={styles.entryText}>
                    {localizeAutoUpdate(t, incident.auto, update.body)}
                  </p>
                </>
              )}
            </div>
          </li>
        ))}

        <li className={classNames(styles.entry, tones[severityTone(incident.severity)])}>
          <div className={styles.rail}>
            <span aria-hidden className={classNames(styles.dot, styles.dotOpened)}>
              {isSeverity(incident.severity) ? SEVERITY_ICON[incident.severity] : SEVERITY_ICON.minor}
            </span>
          </div>
          <div className={styles.entryContent}>
            <div className={styles.entryHead}>
              <Text variant="label-default-s">{t("adminIncidents.detail.timeline.opened")}</Text>
              <span className={styles.time} title={absolute(incident.startedAt)}>
                {relativeAgo(format, incident.startedAt, now)} · {absolute(incident.startedAt)}
              </span>
            </div>
          </div>
        </li>
      </ol>
    </AdminCard>
  );
}

function UpdateEditor({
  update,
  incident,
  pending,
  onSave,
  onCancel,
}: {
  update: IncidentUpdateView;
  incident: IncidentView;
  pending: boolean;
  onSave: (status: IncidentStatus, body: string) => Promise<void>;
  onCancel: () => void;
}) {
  const t = useT();
  const [status, setStatus] = useState<IncidentStatus>(
    isIncidentStatus(update.status) ? update.status : "investigating",
  );
  const [body, setBody] = useState(localizeAutoUpdate(t, incident.auto, update.body));

  const valid = body.trim().length > 0 && body.length <= BODY_MAX;

  return (
    <div className={styles.editor}>
      <StatusPicker
        label={t("adminIncidents.detail.timeline.status")}
        value={status}
        onChange={setStatus}
      />
      <div>
        <Textarea
          id={`edit-update-${update.id}`}
          label={t("adminIncidents.detail.timeline.message")}
          lines={4}
          value={body}
          maxLength={BODY_MAX}
          autoFocus
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onCancel();
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && valid && !pending) {
              event.preventDefault();
              void onSave(status, body);
            }
          }}
        />
        <div className={styles.fieldFoot}>
          <CharCounter count={body.length} max={BODY_MAX} />
        </div>
      </div>
      <div className={styles.buttons}>
        <Button size="s" variant="tertiary" onClick={onCancel} disabled={pending}>
          {t("common.actions.cancel")}
        </Button>
        <Button
          size="s"
          onClick={() => void onSave(status, body)}
          loading={pending}
          disabled={!valid || pending}
        >
          {t("common.actions.save")}
        </Button>
      </div>
    </div>
  );
}
