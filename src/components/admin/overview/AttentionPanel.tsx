import React from "react";
import Link from "next/link";
import { Button, Column, Icon, Row, Tag, Text } from "@once-ui-system/core";
import type { Tone } from "@/lib/admin/defaults";
import { getFormatters, getT } from "@/i18n/server";
import { Panel, StatusDot } from "./primitives";
import type { DraftPost, OpenIncident } from "./types";
import styles from "./Overview.module.scss";

const SEVERITY_TONE: Record<string, Tone> = {
  critical: "danger",
  major: "warning",
  minor: "info",
  maintenance: "info",
};

interface AttentionPanelProps {
  maintenance: boolean;
  incidents: OpenIncident[];
  incidentCount: number;
  drafts: DraftPost[];
  draftCount: number;
}

/** Open incidents, drafts and maintenance mode: what an admin should look at first. */
export async function AttentionPanel({
  maintenance,
  incidents,
  incidentCount,
  drafts,
  draftCount,
}: AttentionPanelProps) {
  const t = await getT();
  const { relative } = await getFormatters();

  const total = incidentCount + draftCount + (maintenance ? 1 : 0);

  return (
    <Panel
      icon="bell"
      title={t("admin.overview.attention.title")}
      description={t("admin.overview.attention.description")}
      aside={
        total === 0 ? (
          <Tag scheme="success" size="m">
            {t("admin.overview.attention.allClear")}
          </Tag>
        ) : (
          <Tag scheme="warning" size="m">
            {t("admin.overview.attention.items", { count: total })}
          </Tag>
        )
      }
    >
      {total === 0 ? (
        <div className={styles.clear}>
          <Icon name="check" size="m" onBackground="success-strong" />
          <Text variant="body-default-s" onBackground="neutral-medium">
            {t("admin.overview.attention.allClearText")}
          </Text>
        </div>
      ) : (
        <Column fillWidth gap="16">
          {maintenance && (
            <div className={styles.notice} role="status">
              <Icon name="warning" size="m" onBackground="warning-strong" />
              <Column className={styles.grow} gap="2">
                <Text variant="body-strong-s">{t("admin.overview.attention.maintenanceTitle")}</Text>
                <Text variant="body-default-xs" onBackground="neutral-medium">
                  {t("admin.overview.attention.maintenanceText")}
                </Text>
              </Column>
              <Button
                variant="secondary"
                size="s"
                href="/admin/config#status"
              >
                {t("admin.overview.attention.maintenanceAction")}
              </Button>
            </div>
          )}

          {incidentCount > 0 && (
            <Column fillWidth gap="4">
              <Row fillWidth horizontal="between" vertical="center">
                <h3 className={styles.subHeading}>
                  {t("admin.overview.attention.incidents", { count: incidentCount })}
                </h3>
                <Button variant="tertiary" size="s" href="/admin/incidents" suffixIcon="chevronRight">
                  {t("admin.overview.attention.viewAll")}
                </Button>
              </Row>
              <ul className={styles.list}>
                {incidents.map((incident) => (
                  <li key={incident.id} className={styles.rowWrap}>
                    <Link href={`/admin/incidents/${incident.id}`} className={styles.row}>
                      <StatusDot tone={SEVERITY_TONE[incident.severity] ?? "info"} />
                      <Column className={styles.grow} gap="2">
                        <Text variant="body-strong-s" className={styles.truncate}>
                          {incident.title || t("admin.overview.attention.untitled")}
                        </Text>
                        <Text variant="body-default-xs" onBackground="neutral-weak">
                          {t(`admin.severity.${incident.severity as "minor"}`)}
                          {" · "}
                          {incident.auto ? `${t("admin.overview.attention.automatic")} · ` : ""}
                          {t("admin.overview.attention.started", {
                            time: relative(incident.startedAt),
                          })}
                        </Text>
                      </Column>
                      <Icon name="chevronRight" size="xs" className={styles.chevron} />
                    </Link>
                  </li>
                ))}
              </ul>
              {incidentCount > incidents.length && (
                <Text variant="body-default-xs" onBackground="neutral-weak" paddingX="12">
                  {t("admin.overview.attention.more", { count: incidentCount - incidents.length })}
                </Text>
              )}
            </Column>
          )}

          {draftCount > 0 && (
            <Column fillWidth gap="4">
              <Row fillWidth horizontal="between" vertical="center">
                <h3 className={styles.subHeading}>
                  {t("admin.overview.attention.drafts", { count: draftCount })}
                </h3>
                <Button variant="tertiary" size="s" href="/admin/news" suffixIcon="chevronRight">
                  {t("admin.overview.attention.viewAll")}
                </Button>
              </Row>
              <ul className={styles.list}>
                {drafts.map((draft) => (
                  <li key={draft.id} className={styles.rowWrap}>
                    <Link href={`/admin/news/${draft.id}`} className={styles.row}>
                      <Icon name="edit" size="s" onBackground="neutral-weak" />
                      <Column className={styles.grow} gap="2">
                        <Text variant="body-strong-s" className={styles.truncate}>
                          {draft.title || t("admin.overview.attention.untitled")}
                        </Text>
                        <Text variant="body-default-xs" onBackground="neutral-weak">
                          {t(`admin.newsCategory.${draft.category as "update"}`)}
                          {" · "}
                          {t("admin.overview.attention.edited", { time: relative(draft.updatedAt) })}
                        </Text>
                      </Column>
                      <Icon name="chevronRight" size="xs" className={styles.chevron} />
                    </Link>
                  </li>
                ))}
              </ul>
              {draftCount > drafts.length && (
                <Text variant="body-default-xs" onBackground="neutral-weak" paddingX="12">
                  {t("admin.overview.attention.more", { count: draftCount - drafts.length })}
                </Text>
              )}
            </Column>
          )}
        </Column>
      )}
    </Panel>
  );
}
