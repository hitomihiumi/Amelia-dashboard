"use client";

import React from "react";
import classNames from "classnames";
import { Column, Flex, Line, Row, Tag, Text } from "@once-ui-system/core";
import { useT } from "@/i18n/client";
import {
  COMPONENT_LABEL_KEYS,
  type IncidentUpdateView,
  SEVERITY_LABEL_KEYS,
  STATUS_LABEL_KEYS,
  isIncidentComponent,
  isIncidentStatus,
  isSeverity,
  severityTone,
  statusTone,
} from "./incidentMeta";
import { useStableFormat } from "./useStableFormat";
import tones from "./tones.module.scss";
import styles from "./IncidentCard.module.scss";

export interface IncidentCardProps {
  incident: {
    title: string;
    body: string | null;
    severity: string;
    /** Already resolved: "resolved" when the incident has a resolvedAt. */
    status: string;
    component: string | null;
    startedAt: Date | string;
    resolvedAt: Date | string | null;
  };
  /** Oldest first, with any automatic text already translated. */
  updates: IncidentUpdateView[];
  /** Dims the title, used by the live preview while nothing has been typed. */
  titleMuted?: boolean;
}

/**
 * One incident as it appears in the public history. Shared by /status and the
 * live preview of the admin report form, so the two can never drift apart.
 */
export function IncidentCard({ incident, updates, titleMuted }: IncidentCardProps) {
  const t = useT();
  const format = useStableFormat();

  const severityLabel = isSeverity(incident.severity)
    ? t(SEVERITY_LABEL_KEYS[incident.severity])
    : incident.severity;
  const statusLabel = (status: string) =>
    isIncidentStatus(status) ? t(STATUS_LABEL_KEYS[status]) : status;

  const startedOn = format.date(incident.startedAt, { dateStyle: "long" });
  const resolvedOn = incident.resolvedAt
    ? format.date(incident.resolvedAt, { dateStyle: "long" })
    : null;

  // The first update usually repeats the opening message; show it once.
  const showBody = incident.body && !updates.some((update) => update.body === incident.body);

  return (
    <Flex
      as="article"
      direction="column"
      fillWidth
      gap="12"
      padding="20"
      radius="l"
      border="neutral-medium"
      background="surface"
      className={classNames(styles.card, tones[severityTone(incident.severity)])}
    >
      <Row fillWidth horizontal="between" vertical="center" gap="8" wrap>
        <Text
          variant="heading-strong-s"
          className={classNames(styles.title, titleMuted && styles.muted)}
        >
          {incident.title}
        </Text>
        <Row gap="8" vertical="center" wrap>
          <Tag scheme={severityTone(incident.severity)}>{severityLabel}</Tag>
          <Tag scheme={statusTone(incident.status)}>{statusLabel(incident.status)}</Tag>
        </Row>
      </Row>

      <Row gap="8" vertical="center" wrap>
        <Text variant="body-default-xs" onBackground="neutral-weak">
          {startedOn}
          {resolvedOn && resolvedOn !== startedOn ? ` — ${resolvedOn}` : ""}
        </Text>
        {incident.component && isIncidentComponent(incident.component) && (
          <Tag size="s" scheme="neutral">
            {t(COMPONENT_LABEL_KEYS[incident.component])}
          </Tag>
        )}
      </Row>

      {showBody && (
        <Text variant="body-default-s" onBackground="neutral-medium" className={styles.updateBody}>
          {incident.body}
        </Text>
      )}

      {updates.length > 0 && (
        <>
          <Line />
          <ul className={styles.updates}>
            {updates.map((update) => (
              <li key={update.id} className={classNames(styles.update, tones[statusTone(update.status)])}>
                <span aria-hidden className={styles.dot} />
                <Column gap="2" style={{ minWidth: 0 }}>
                  <Text variant="label-default-s">{statusLabel(update.status)}</Text>
                  <Text
                    variant="body-default-s"
                    onBackground="neutral-medium"
                    className={styles.updateBody}
                  >
                    {update.body}
                  </Text>
                  <Text variant="body-default-xs" onBackground="neutral-weak">
                    {format.date(update.createdAt, { dateStyle: "long" })}
                  </Text>
                </Column>
              </li>
            ))}
          </ul>
        </>
      )}
    </Flex>
  );
}
