import React from "react";
import { RevealFx, Row, Tag } from "@once-ui-system/core";
import type { StatusSnapshot } from "@/lib/status/status";
import { STATUS_TONE } from "@/lib/admin/defaults";
import { AdminPage } from "@/components/admin/AdminPage";
import { getT } from "@/i18n/server";
import { AttentionPanel } from "./AttentionPanel";
import { QuickActions } from "./QuickActions";
import { RecentPosts } from "./RecentPosts";
import { ServicesPanel } from "./ServicesPanel";
import { StatTiles } from "./StatTiles";
import { StatusDot } from "./primitives";
import type { DraftPost, OpenIncident, PublishedPost } from "./types";
import styles from "./Overview.module.scss";

export interface OverviewData {
  adminName: string;
  snapshot: StatusSnapshot;
  maintenance: boolean;
  incidents: OpenIncident[];
  incidentCount: number;
  drafts: DraftPost[];
  draftCount: number;
  recent: PublishedPost[];
}

/** The control-room view: numbers on top, then what needs attention and where to go next. */
export async function OverviewDashboard({ data }: { data: OverviewData }) {
  const t = await getT();
  const tone = STATUS_TONE[data.snapshot.overall];

  // Panels fade in one after another, after the tiles above them.
  const reveal = (index: number) => 360 + index * 80;

  return (
    <AdminPage
     
      title={t("admin.overview.welcome", { name: data.adminName })}
      description={t("admin.overview.subtitle")}
      actions={
        <Tag scheme={tone} size="l">
          <Row gap="8" vertical="center">
            <StatusDot tone={tone} />
            {t(`admin.overview.overall.${data.snapshot.overall}`)}
          </Row>
        </Tag>
      }
    >
      <StatTiles metrics={data.snapshot.metrics} />

      <div className={styles.body}>
        <div className={styles.column}>
          <RevealFx fillWidth className={styles.orderServices} delay={reveal(0)} speed="fast" translateY="8">
            <ServicesPanel snapshot={data.snapshot} />
          </RevealFx>
          <RevealFx fillWidth className={styles.orderRecent} delay={reveal(2)} speed="fast" translateY="8">
            <RecentPosts posts={data.recent} />
          </RevealFx>
        </div>
        <div className={styles.column}>
          <RevealFx fillWidth className={styles.orderAttention} delay={reveal(1)} speed="fast" translateY="8">
            <AttentionPanel
              maintenance={data.maintenance}
              incidents={data.incidents}
              incidentCount={data.incidentCount}
              drafts={data.drafts}
              draftCount={data.draftCount}
            />
          </RevealFx>
          <RevealFx fillWidth className={styles.orderActions} delay={reveal(3)} speed="fast" translateY="8">
            <QuickActions />
          </RevealFx>
        </div>
      </div>
    </AdminPage>
  );
}
