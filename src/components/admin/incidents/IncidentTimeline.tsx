"use client";

import React, { useState } from "react";
import classNames from "classnames";
import { Button, Column, Grid, IconButton, Row, Text, Textarea } from "@once-ui-system/core";
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
  type ToneScheme,
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
        <Column fillWidth padding="16" radius="m" border="neutral-alpha-strong" borderStyle="dashed">
          <Text as="p" variant="body-default-s" onBackground="neutral-weak">
            {t("adminIncidents.detail.timeline.empty")}
          </Text>
        </Column>
      )}

      <Column as="ol" fillWidth margin="0" padding="0">
        {updates.map((update) => {
          const tone = statusTone(update.status);

          return (
            <TimelineEntry
              key={update.id}
              tone={tone}
              icon={isIncidentStatus(update.status) ? STATUS_ICON[update.status] : null}
              line
            >
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
                  <EntryHead>
                    <StatusChip status={update.status} />
                    <Text variant="body-default-xs" onBackground="neutral-weak" title={absolute(update.createdAt)}>
                      {relativeAgo(format, update.createdAt, now)} · {absolute(update.createdAt)}
                    </Text>
                    <Row fitWidth gap="2" vertical="center" style={{ marginLeft: "auto" }}>
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
                    </Row>
                  </EntryHead>
                  <Text
                    as="p"
                    variant="body-default-m"
                    onBackground="neutral-medium"
                    style={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap", lineHeight: 1.55 }}
                  >
                    {localizeAutoUpdate(t, incident.auto, update.body)}
                  </Text>
                </>
              )}
            </TimelineEntry>
          );
        })}

        <TimelineEntry
          tone={severityTone(incident.severity)}
          icon={isSeverity(incident.severity) ? SEVERITY_ICON[incident.severity] : SEVERITY_ICON.minor}
          opened
        >
          <EntryHead>
            <Text variant="label-default-s">{t("adminIncidents.detail.timeline.opened")}</Text>
            <Text variant="body-default-xs" onBackground="neutral-weak" title={absolute(incident.startedAt)}>
              {relativeAgo(format, incident.startedAt, now)} · {absolute(incident.startedAt)}
            </Text>
          </EntryHead>
        </TimelineEntry>
      </Column>
    </AdminCard>
  );
}

/** One row of the timeline: a dot on the rail on the left, the content on the right. */
function TimelineEntry({
  tone,
  icon,
  line,
  opened,
  children,
}: {
  tone: ToneScheme;
  icon: React.ReactNode;
  /** Draw the rail down to the next entry. */
  line?: boolean;
  /** The first event of the incident: a dashed, empty dot and no content padding. */
  opened?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Grid
      as="li"
      fillWidth
      className={tones[tone]}
      style={{ gridTemplateColumns: "2.25rem minmax(0, 1fr)", columnGap: "var(--static-space-16)" }}
    >
      <Column horizontal="center">
        <Row
          center
          width={2.25}
          height={2.25}
          radius="full"
          border={`${tone}-strong`}
          borderStyle={opened ? "dashed" : "solid"}
          background={opened ? "transparent" : `${tone}-alpha-weak`}
          onBackground={`${tone}-strong`}
          aria-hidden
          style={{ flexShrink: 0, fontSize: "1.125rem" }}
        >
          {icon}
        </Row>
        {line && (
          <Row
            flex={1}
            width="2"
            minHeight="16"
            marginY="4"
            radius="xs"
            background="neutral-alpha-medium"
            aria-hidden
          />
        )}
      </Column>

      <Column fillWidth gap="8" paddingBottom={opened ? undefined : "24"}>
        {children}
      </Column>
    </Grid>
  );
}

function EntryHead({ children }: { children: React.ReactNode }) {
  return (
    <Row
      fillWidth
      wrap
      vertical="center"
      gap="4"
      minHeight={2.25}
      style={{ columnGap: "var(--static-space-12)" }}
    >
      {children}
    </Row>
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
    <Column
      fillWidth
      gap="12"
      padding="16"
      radius="m"
      border="neutral-alpha-medium"
      background="neutral-alpha-weak"
    >
      <StatusPicker
        label={t("adminIncidents.detail.timeline.status")}
        value={status}
        onChange={setStatus}
      />
      <Column fillWidth>
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
        <Row fillWidth horizontal="end" marginTop="4">
          <CharCounter count={body.length} max={BODY_MAX} />
        </Row>
      </Column>
      <Row fillWidth wrap vertical="center" horizontal="end" gap="8">
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
      </Row>
    </Column>
  );
}
