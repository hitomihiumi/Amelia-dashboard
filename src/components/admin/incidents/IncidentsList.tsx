"use client";

import React, { useState } from "react";
import Link from "next/link";
import classNames from "classnames";
import { Button, Row, Tag, Text } from "@once-ui-system/core";
import {
  IoCheckmarkCircleOutline,
  IoChevronForward,
  IoChatbubbleEllipsesOutline,
  IoHourglassOutline,
  IoTimeOutline,
  IoArchiveOutline,
} from "react-icons/io5";
import { useT } from "@/i18n/client";
import {
  effectiveStatus,
  type IncidentView,
  localizeAutoIncident,
  localizeAutoUpdate,
  severityTone,
  toMs,
} from "@/components/status/incidentMeta";
import { useStableFormat } from "@/components/status/useStableFormat";
import tones from "@/components/status/tones.module.scss";
import {
  AutoBadge,
  formatDuration,
  relativeAgo,
  StatusChip,
  useIncidentLabels,
  useNow,
} from "./incidentUi";
import { INCIDENTS_PATH } from "./types";
import styles from "./IncidentsList.module.scss";

type Tab = "active" | "history";

const PAGE_SIZE = 15;

interface IncidentsListProps {
  incidents: IncidentView[];
  /** Server time the page was rendered at, so relative times match during hydration. */
  now: number;
  initialTab?: Tab;
  basePath?: string;
}

export function IncidentsList({
  incidents,
  now: serverNow,
  initialTab = "active",
  basePath = INCIDENTS_PATH,
}: IncidentsListProps) {
  const t = useT();
  const now = useNow(serverNow);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const active = incidents.filter((incident) => !incident.resolvedAt);
  const history = incidents.filter((incident) => incident.resolvedAt);
  const shown = tab === "active" ? active : history;

  const selectTab = (next: Tab) => {
    setTab(next);
    setVisible(PAGE_SIZE);
    try {
      const url = new URL(window.location.href);
      if (next === "active") url.searchParams.delete("tab");
      else url.searchParams.set("tab", next);
      window.history.replaceState(null, "", url);
    } catch {
      // The tab still switches; it just won't survive a reload.
    }
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "active", label: t("adminIncidents.list.tabs.active"), count: active.length },
    { id: "history", label: t("adminIncidents.list.tabs.history"), count: history.length },
  ];

  return (
    <>
      <div className={styles.tabs} role="tablist" aria-label={t("adminIncidents.list.tabsLabel")}>
        {tabs.map(({ id, label, count }) => (
          <button
            key={id}
            id={`incidents-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls="incidents-panel"
            className={styles.tab}
            onClick={() => selectTab(id)}
          >
            {label}
            <span className={classNames(styles.count, id === "active" && count > 0 && styles.countAlert)}>
              {count}
            </span>
          </button>
        ))}
      </div>

      <div id="incidents-panel" role="tabpanel" aria-labelledby={`incidents-tab-${tab}`}>
        {shown.length === 0 ? (
          <EmptyState tab={tab} basePath={basePath} />
        ) : (
          <>
            <ul className={styles.list}>
              {shown.slice(0, visible).map((incident) => (
                <li key={incident.id}>
                  <IncidentRow incident={incident} now={now} basePath={basePath} />
                </li>
              ))}
            </ul>

            {shown.length > visible && (
              <Row fillWidth horizontal="center" paddingTop="16">
                <Button variant="secondary" onClick={() => setVisible((count) => count + PAGE_SIZE)}>
                  {t("adminIncidents.list.showMore")}
                </Button>
              </Row>
            )}
          </>
        )}
      </div>
    </>
  );
}

function EmptyState({ tab, basePath }: { tab: Tab; basePath: string }) {
  const t = useT();
  const isActive = tab === "active";

  return (
    <div className={classNames(styles.empty, tones[isActive ? "success" : "neutral"])}>
      <span aria-hidden className={styles.emptyIcon}>
        {isActive ? <IoCheckmarkCircleOutline /> : <IoArchiveOutline />}
      </span>
      <Text variant="heading-strong-m">
        {t(isActive ? "adminIncidents.list.empty.activeTitle" : "adminIncidents.list.empty.historyTitle")}
      </Text>
      <Text variant="body-default-s" onBackground="neutral-weak" style={{ maxWidth: "26rem" }}>
        {t(isActive ? "adminIncidents.list.empty.activeText" : "adminIncidents.list.empty.historyText")}
      </Text>
      {isActive && (
        <Button href={`${basePath}/new`} prefixIcon="plus" variant="secondary">
          {t("adminIncidents.list.report")}
        </Button>
      )}
    </div>
  );
}

function IncidentRow({
  incident,
  now,
  basePath,
}: {
  incident: IncidentView;
  now: number;
  basePath: string;
}) {
  const t = useT();
  const format = useStableFormat();
  const labels = useIncidentLabels();

  const shown = localizeAutoIncident(t, incident);
  const status = effectiveStatus(incident);
  const resolved = Boolean(incident.resolvedAt);

  const startedMs = toMs(incident.startedAt);
  const durationMs = (incident.resolvedAt ? toMs(incident.resolvedAt) : now) - startedMs;
  const duration = formatDuration(t, durationMs);

  const last = incident.updates.reduce<IncidentView["updates"][number] | null>(
    (latest, update) => (!latest || toMs(update.createdAt) >= toMs(latest.createdAt) ? update : latest),
    null,
  );

  return (
    <Link
      href={`${basePath}/${incident.id}`}
      aria-label={t("adminIncidents.list.openIncident", { title: shown.title })}
      className={classNames(
        styles.item,
        resolved && styles.itemResolved,
        tones[severityTone(incident.severity)],
      )}
    >
      <span aria-hidden className={styles.bar} />

      <span className={styles.itemBody}>
        <span className={styles.itemHead}>
          <Text variant="heading-strong-s" className={styles.itemTitle}>
            {shown.title}
          </Text>
          <IoChevronForward aria-hidden className={styles.chevron} />
        </span>

        <span className={styles.badges}>
          <Tag scheme={severityTone(incident.severity)}>{labels.severity(incident.severity)}</Tag>
          <StatusChip status={status} ongoing={!resolved} />
          {incident.component && <Tag scheme="neutral">{labels.component(incident.component)}</Tag>}
          {incident.auto && <AutoBadge />}
        </span>

        <span className={styles.meta}>
          <span
            className={styles.metaItem}
            title={format.dateTime(incident.startedAt, { dateStyle: "long", timeStyle: "short" })}
          >
            <IoTimeOutline aria-hidden />
            {t("adminIncidents.meta.started", { time: relativeAgo(format, incident.startedAt, now) })}
            <span aria-hidden>·</span>
            {format.dateTime(incident.startedAt)}
          </span>
          <span className={styles.metaItem}>
            <IoHourglassOutline aria-hidden />
            {t(resolved ? "adminIncidents.meta.lasted" : "adminIncidents.meta.ongoing", { duration })}
          </span>
          <span className={styles.metaItem}>
            <IoChatbubbleEllipsesOutline aria-hidden />
            {incident.updates.length > 0
              ? t("adminIncidents.list.updates", { count: incident.updates.length })
              : t("adminIncidents.list.noUpdates")}
          </span>
        </span>

        {last && (
          <LastUpdate status={last.status} body={localizeAutoUpdate(t, incident.auto, last.body)} />
        )}
      </span>
    </Link>
  );
}

function LastUpdate({ status, body }: { status: string; body: string }) {
  const labels = useIncidentLabels();

  return (
    <span className={styles.preview}>
      <strong>{labels.status(status)}:</strong> {body}
    </span>
  );
}
