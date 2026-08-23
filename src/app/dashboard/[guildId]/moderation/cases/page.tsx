import React from "react";
import { Flex, RevealFx, Text } from "@once-ui-system/core";
import { prisma } from "@/lib/db/db";
import { CASE_TYPE_LABELS } from "@/lib/moderation/embeds";
import { CasesClient, type CaseItem } from "./CasesClient";

const PER_PAGE = 20;
const TYPES = ["all", "warn", "mute", "ban", "kick", "note"];
const SNOWFLAKE = /^\d{17,20}$/;

export default async function ModerationCasesPage({
  params,
  searchParams,
}: {
  params: Promise<{ guildId: string }>;
  searchParams: Promise<{ type?: string; user?: string; page?: string }>;
}) {
  const { guildId } = await params;
  const query = await searchParams;

  const type = TYPES.includes(query.type ?? "") ? query.type! : "all";
  const user = SNOWFLAKE.test(query.user ?? "") ? query.user! : "";
  const page = Math.max(1, Number(query.page) || 1);

  const where = {
    guildId,
    ...(type === "all" ? {} : { type }),
    ...(user ? { targetId: user } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.moderationCase.findMany({
      where,
      orderBy: { caseNumber: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
    }),
    prisma.moderationCase.count({ where }),
  ]);

  const items: CaseItem[] = rows.map((entry) => ({
    id: entry.id,
    caseNumber: entry.caseNumber,
    type: entry.type,
    typeLabel: CASE_TYPE_LABELS[entry.type] ?? entry.type,
    targetId: entry.targetId,
    moderatorId: entry.moderatorId,
    reason: entry.reason,
    duration: entry.duration,
    expiresAt: entry.expiresAt?.toISOString() ?? null,
    active: entry.active,
    source: entry.source,
    createdAt: entry.createdAt.toISOString(),
  }));

  return (
    <Flex direction="column" gap="24">
      <RevealFx direction="column" gap="8" translateY={-0.5}>
        <Text variant="heading-strong-l">Case log</Text>
        <Text variant="body-default-m" onBackground="neutral-medium">
          Every moderation action taken by commands, auto moderation or the dashboard. Revoking a
          case lifts the punishment in Discord as well.
        </Text>
      </RevealFx>

      <CasesClient
        guildId={guildId}
        items={items}
        type={type}
        user={query.user ?? ""}
        page={page}
        pages={Math.max(1, Math.ceil(total / PER_PAGE))}
      />
    </Flex>
  );
}
