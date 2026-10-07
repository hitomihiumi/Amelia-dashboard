"use client";

import React, { useState, useTransition } from "react";
import {
  Avatar,
  Button,
  Column,
  DateInput,
  Grid,
  IconButton,
  Input,
  Row,
  Switch,
  Tag,
  Text,
  useToast,
} from "@once-ui-system/core";
import { useRouter } from "next/navigation";
import { Section } from "@/components/dashboard/Section";
import { SectionGrid } from "@/components/layout/SectionGrid";
import { ConfirmIconButton } from "@/components/dashboard/ConfirmIconButton";
import type { PremiumGuildRow } from "@/lib/admin/ai";
import { useT } from "@/i18n/client";
import { grantPremium, revokePremium } from "./actions";

/** `YYYY-MM-DD` of an ISO timestamp, in UTC like the end date the server stores. */
const day = (iso: string) => iso.slice(0, 10);

const pad = (value: number) => String(value).padStart(2, "0");

/** The day a calendar pick stands for, as the `YYYY-MM-DD` the server expects. */
const toDay = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** A `YYYY-MM-DD` day as a date on the local calendar, so the picker shows the same day. */
const fromDay = (value: string) => {
  const [year, month, date] = value.split("-").map(Number);
  return new Date(year, month - 1, date);
};

/** Where the end date starts when someone turns "no end date" off: a month ahead. */
const inAMonth = () => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date;
};

/**
 * Premium servers: who has it, until when, and the form to give or change it.
 * Unlike the limits above these act at once; there is nothing to save afterwards.
 */
export function PremiumPanel({ guilds }: { guilds: PremiumGuildRow[] }) {
  const t = useT();
  const router = useRouter();
  const { addToast } = useToast();
  const [pending, startTransition] = useTransition();

  const [guildId, setGuildId] = useState("");
  // `null` means premium without an end date.
  const [until, setUntil] = useState<Date | null>(null);
  const [note, setNote] = useState("");

  const run = (action: () => Promise<{ ok: true } | { ok: false; error: string }>, done: string) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        addToast({ message: done, variant: "success" });
        router.refresh();
      } else {
        addToast({ message: result.error, variant: "danger" });
      }
    });

  const handleGrant = () =>
    run(async () => {
      const result = await grantPremium(guildId, until ? toDay(until) : "", note);
      if (result.ok) {
        setGuildId("");
        setUntil(null);
        setNote("");
      }
      return result;
    }, t("adminAi.premium.granted"));

  const edit = (row: PremiumGuildRow) => {
    setGuildId(row.id);
    setUntil(row.until ? fromDay(day(row.until)) : null);
    setNote(row.note ?? "");
    document
      .getElementById("premium-guild-id")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <SectionGrid>
      <Section
        title={t("adminAi.premium.title")}
        description={t("adminAi.premium.description")}
        span="full"
        num={3}
        icon="navAi"
      >
        <Grid
          fillWidth
          gap="16"
          minWidth={0}
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
            alignItems: "start",
          }}
        >
          <Input
            id="premium-guild-id"
            label={t("adminAi.premium.guildId")}
            placeholder="123456789012345678"
            inputMode="numeric"
            maxLength={20}
            value={guildId}
            onChange={(e) => setGuildId(e.target.value)}
          />
          <Input
            id="premium-note"
            label={t("adminAi.premium.note")}
            placeholder={t("adminAi.premium.notePlaceholder")}
            maxLength={200}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Grid>

        <Row fillWidth gap="24" vertical="center" wrap>
          <Switch
            label={t("adminAi.premium.noEnd")}
            description={t("adminAi.premium.untilHint")}
            checked={until === null}
            onToggle={() => setUntil(until === null ? inAMonth() : null)}
          />
          {until !== null && (
            <DateInput
              id="premium-until"
              label={t("adminAi.premium.until")}
              value={until}
              minDate={new Date()}
              onChange={(date: Date) => setUntil(date)}
              style={{ minWidth: 220 }}
            />
          )}
        </Row>

        <Row>
          <Button
            variant="primary"
            size="m"
            disabled={pending || !guildId.trim()}
            loading={pending}
            onClick={handleGrant}
          >
            {t("adminAi.premium.give")}
          </Button>
        </Row>

        <Column fillWidth gap="8">
          <Text variant="label-default-s" onBackground="neutral-weak">
            {t("adminAi.premium.listTitle", { count: guilds.length })}
          </Text>

          {guilds.length === 0 ? (
            <Text variant="body-default-s" onBackground="neutral-weak">
              {t("adminAi.premium.empty")}
            </Text>
          ) : (
            guilds.map((row) => (
              <Row
                key={row.id}
                fillWidth
                gap="16"
                padding="12"
                radius="m"
                border="neutral-medium"
                vertical="center"
                horizontal="between"
                s={{ direction: "column", vertical: "start" }}
              >
                <Row gap="12" vertical="center" minWidth={0}>
                  <Avatar src={row.iconUrl ?? undefined} size="m" />
                  <Column gap="2" minWidth={0}>
                    <Text variant="label-strong-m">
                      {row.name ?? t("adminAi.premium.unknownGuild")}
                    </Text>
                    <Text variant="body-default-xs" onBackground="neutral-weak">
                      {row.id}
                      {row.note ? ` · ${row.note}` : ""}
                    </Text>
                  </Column>
                </Row>

                <Row gap="12" vertical="center">
                  <Tag scheme={row.active ? "success" : "danger"} size="m">
                    {row.active ? t("adminAi.premium.active") : t("adminAi.premium.expired")}
                  </Tag>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    {row.until
                      ? t("adminAi.premium.endsOn", { date: day(row.until) })
                      : t("adminAi.premium.noEnd")}
                  </Text>
                  <IconButton
                    icon="actionModal"
                    variant="ghost"
                    size="s"
                    tooltip={t("adminAi.premium.edit")}
                    onClick={() => edit(row)}
                  />
                  <ConfirmIconButton
                    variant="confirm"
                    tooltip={t("adminAi.premium.revoke")}
                    confirmMessage={t("adminAi.premium.revokeConfirm")}
                    onConfirm={() => run(() => revokePremium(row.id), t("adminAi.premium.revoked"))}
                  />
                </Row>
              </Row>
            ))
          )}
        </Column>
      </Section>
    </SectionGrid>
  );
}
