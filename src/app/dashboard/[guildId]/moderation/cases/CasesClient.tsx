"use client";

import React, { useState } from "react";
import {
  Button,
  Column,
  Feedback,
  Flex,
  Input,
  Row,
  SegmentedControl,
  Tag,
  Text,
  useToast,
} from "@once-ui-system/core";
import { useRouter } from "next/navigation";
import type { GuildActionState } from "@/types/dashboard";
import { revokeModerationCase } from "../actions";

export interface CaseItem {
  id: string;
  caseNumber: number;
  type: string;
  typeLabel: string;
  targetId: string;
  moderatorId: string;
  reason: string;
  duration: number | null;
  expiresAt: string | null;
  active: boolean;
  source: string;
  createdAt: string;
}

const TYPE_FILTERS = [
  { value: "all", label: "All" },
  { value: "warn", label: "Warns" },
  { value: "mute", label: "Mutes" },
  { value: "ban", label: "Bans" },
  { value: "kick", label: "Kicks" },
  { value: "note", label: "Notes" },
];

const REVOCABLE = ["warn", "mute", "ban"];

export function CasesClient({
  guildId,
  items,
  type,
  user,
  page,
  pages,
}: {
  guildId: string;
  items: CaseItem[];
  type: string;
  user: string;
  page: number;
  pages: number;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(user);

  const navigate = (next: { type?: string; user?: string; page?: number }) => {
    const params = new URLSearchParams();
    params.set("type", next.type ?? type);
    if ((next.user ?? user).trim()) params.set("user", (next.user ?? user).trim());
    params.set("page", String(next.page ?? 1));
    router.push(`/dashboard/${guildId}/moderation/cases?${params.toString()}`);
  };

  return (
    <Column fillWidth gap="16">
      <Row fillWidth gap="12" vertical="center" wrap>
        <SegmentedControl
          buttons={TYPE_FILTERS}
          selected={type}
          onToggle={(value) => navigate({ type: value, page: 1 })}
        />
        <Input
          id="case-user"
          label="Filter by user ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button variant="secondary" onClick={() => navigate({ user: search, page: 1 })}>
          Search
        </Button>
      </Row>

      {items.length === 0 && (
        <Feedback
          variant="info"
          title="No cases"
          description="Nothing matches the current filters."
        />
      )}

      {items.map((item) => (
        <CaseCard key={item.id} guildId={guildId} item={item} />
      ))}

      {pages > 1 && (
        <Row fillWidth gap="8" horizontal="center" vertical="center">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => navigate({ page: page - 1 })}
          >
            Previous
          </Button>
          <Text variant="body-default-s" onBackground="neutral-weak">
            Page {page} / {pages}
          </Text>
          <Button
            variant="secondary"
            disabled={page >= pages}
            onClick={() => navigate({ page: page + 1 })}
          >
            Next
          </Button>
        </Row>
      )}
    </Column>
  );
}

function CaseCard({ guildId, item }: { guildId: string; item: CaseItem }) {
  const router = useRouter();
  const { addToast } = useToast();

  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  const canRevoke = item.active && REVOCABLE.includes(item.type);

  const revoke = async () => {
    setPending(true);

    const result: GuildActionState = await revokeModerationCase(guildId, item.caseNumber, reason);

    setPending(false);

    if (result?.ok) {
      addToast({ message: `Case #${item.caseNumber} revoked`, variant: "success" });
      router.refresh();
    } else {
      addToast({ message: result?.error || "Action failed", variant: "danger" });
    }
  };

  return (
    <Flex
      direction="column"
      fillWidth
      gap="8"
      padding="20"
      radius="l"
      border="neutral-medium"
      background="surface"
    >
      <Row fillWidth horizontal="between" vertical="center" gap="8" wrap>
        <Text variant="heading-strong-s">
          #{item.caseNumber} • {item.typeLabel}
        </Text>
        <Tag variant={item.active ? "danger" : "neutral"}>{item.active ? "Active" : "Closed"}</Tag>
      </Row>

      <Text variant="body-default-s" onBackground="neutral-weak">
        User: {item.targetId} • Moderator:{" "}
        {item.moderatorId === "AUTOMOD" ? "Auto moderation" : item.moderatorId} • {item.source}
      </Text>

      <Text variant="body-default-s" onBackground="neutral-medium">
        {item.reason}
      </Text>

      <Text variant="body-default-xs" onBackground="neutral-weak">
        {new Date(item.createdAt).toLocaleString()}
        {item.expiresAt ? ` • expires ${new Date(item.expiresAt).toLocaleString()}` : ""}
      </Text>

      {canRevoke && (
        <Row fillWidth gap="8" vertical="center" wrap>
          <Input
            id={`revoke-reason-${item.id}`}
            label="Revocation reason"
            value={reason}
            maxLength={400}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button variant="danger" disabled={pending} onClick={revoke}>
            Revoke
          </Button>
        </Row>
      )}
    </Flex>
  );
}
