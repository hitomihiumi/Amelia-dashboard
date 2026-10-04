"use client";

import React, { useState } from "react";
import classNames from "classnames";
import { Button, Card, Column, Grid, Row, SegmentedControl, Tag, Text } from "@once-ui-system/core";
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
      <Row>
        <SegmentedControl
          fillWidth={false}
          aria-label={t("adminIncidents.list.tabsLabel")}
          value={tab}
          onChange={(value) => selectTab(value as Tab)}
          buttons={tabs.map(({ id, label, count }) => ({
            value: id,
            id: `incidents-tab-${id}`,
            "aria-controls": "incidents-panel",
            size: "l",
            weight: "strong",
            label: (
              <Row vertical="center" gap="8">
                {label}
                <Row
                  minWidth={1.5}
                  paddingX="8"
                  radius="full"
                  center
                  background={id === "active" && count > 0 ? "danger-alpha-medium" : "neutral-alpha-weak"}
                  onBackground={id === "active" && count > 0 ? "danger-strong" : "neutral-medium"}
                >
                  <Text variant="label-default-xs" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {count}
                  </Text>
                </Row>
              </Row>
            ),
          }))}
        />
      </Row>

      <Column id="incidents-panel" role="tabpanel" aria-labelledby={`incidents-tab-${tab}`} fillWidth>
        {shown.length === 0 ? (
          <EmptyState tab={tab} basePath={basePath} />
        ) : (
          <>
            <Grid as="ul" fillWidth margin="0" padding="0" className={styles.list}>
              {shown.slice(0, visible).map((incident) => (
                <Row as="li" key={incident.id} fillWidth>
                  <IncidentRow incident={incident} now={now} basePath={basePath} />
                </Row>
              ))}
            </Grid>

            {shown.length > visible && (
              <Row fillWidth horizontal="center" paddingTop="16">
                <Button variant="secondary" onClick={() => setVisible((count) => count + PAGE_SIZE)}>
                  {t("adminIncidents.list.showMore")}
                </Button>
              </Row>
            )}
          </>
        )}
      </Column>
    </>
  );
}

function EmptyState({ tab, basePath }: { tab: Tab; basePath: string }) {
  const t = useT();
  const isActive = tab === "active";
  const tone = isActive ? "success" : "neutral";

  return (
    <Column
      fillWidth
      horizontal="center"
      gap="12"
      paddingX="24"
      paddingY="48"
      radius="l"
      border="neutral-alpha-strong"
      borderStyle="dashed"
    >
      <Row
        width={4}
        height={4}
        center
        radius="full"
        border={`${tone}-alpha-strong`}
        background={`${tone}-alpha-weak`}
        onBackground={`${tone}-strong`}
        aria-hidden
      >
        {isActive ? <IoCheckmarkCircleOutline size={32} /> : <IoArchiveOutline size={32} />}
      </Row>
      <Text variant="heading-strong-m" align="center">
        {t(isActive ? "adminIncidents.list.empty.activeTitle" : "adminIncidents.list.empty.historyTitle")}
      </Text>
      <Text variant="body-default-s" onBackground="neutral-weak" align="center" style={{ maxWidth: "26rem" }}>
        {t(isActive ? "adminIncidents.list.empty.activeText" : "adminIncidents.list.empty.historyText")}
      </Text>
      {isActive && (
        <Button href={`${basePath}/new`} prefixIcon="plus" variant="secondary">
          {t("adminIncidents.list.report")}
        </Button>
      )}
    </Column>
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
  const tone = severityTone(incident.severity);

  const startedMs = toMs(incident.startedAt);
  const durationMs = (incident.resolvedAt ? toMs(incident.resolvedAt) : now) - startedMs;
  const duration = formatDuration(t, durationMs);

  const last = incident.updates.reduce<IncidentView["updates"][number] | null>(
    (latest, update) => (!latest || toMs(update.createdAt) >= toMs(latest.createdAt) ? update : latest),
    null,
  );

  return (
    <Card
      href={`${basePath}/${incident.id}`}
      aria-label={t("adminIncidents.list.openIncident", { title: shown.title })}
      fillWidth
      overflow="hidden"
      radius="l"
      border="neutral-alpha-medium"
      className={classNames(styles.item, tones[tone])}
    >
      <Row
        aria-hidden
        width="4"
        solid={`${tone}-strong`}
        opacity={resolved ? 60 : 100}
        style={{ flexShrink: 0 }}
      />

      <Column fillWidth flex={1} gap="12" paddingX="20" paddingY="16">
        <Row fillWidth vertical="start" horizontal="between" gap="12">
          <Text variant="heading-strong-s" className={styles.itemTitle}>
            {shown.title}
          </Text>
          <IoChevronForward aria-hidden className={styles.chevron} />
        </Row>

        <Row wrap vertical="center" gap="8">
          <Tag scheme={tone}>{labels.severity(incident.severity)}</Tag>
          <StatusChip status={status} ongoing={!resolved} />
          {incident.component && <Tag scheme="neutral">{labels.component(incident.component)}</Tag>}
          {incident.auto && <AutoBadge />}
        </Row>

        <Row
          wrap
          vertical="center"
          gap="4"
          textVariant="body-default-xs"
          onBackground="neutral-weak"
          style={{ columnGap: "var(--static-space-16)" }}
        >
          <Row
            fitWidth
            vertical="center"
            gap="4"
            title={format.dateTime(incident.startedAt, { dateStyle: "long", timeStyle: "short" })}
            style={{ whiteSpace: "nowrap" }}
          >
            <IoTimeOutline aria-hidden />
            {t("adminIncidents.meta.started", { time: relativeAgo(format, incident.startedAt, now) })}
            <Text as="span" aria-hidden>
              ·
            </Text>
            {format.dateTime(incident.startedAt)}
          </Row>
          <Row fitWidth vertical="center" gap="4" style={{ whiteSpace: "nowrap" }}>
            <IoHourglassOutline aria-hidden />
            {t(resolved ? "adminIncidents.meta.lasted" : "adminIncidents.meta.ongoing", { duration })}
          </Row>
          <Row fitWidth vertical="center" gap="4" style={{ whiteSpace: "nowrap" }}>
            <IoChatbubbleEllipsesOutline aria-hidden />
            {incident.updates.length > 0
              ? t("adminIncidents.list.updates", { count: incident.updates.length })
              : t("adminIncidents.list.noUpdates")}
          </Row>
        </Row>

        {last && (
          <LastUpdate status={last.status} body={localizeAutoUpdate(t, incident.auto, last.body)} />
        )}
      </Column>
    </Card>
  );
}

function LastUpdate({ status, body }: { status: string; body: string }) {
  const labels = useIncidentLabels();

  return (
    <Text variant="body-default-s" onBackground="neutral-medium" className={styles.preview}>
      <Text as="span" weight="strong">
        {labels.status(status)}:
      </Text>{" "}
      {body}
    </Text>
  );
}
