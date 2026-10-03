"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Flex,
  Text,
  Input,
  Row,
  Column,
  Switch,
  SegmentedControl,
  Slider,
  Line,
  useToast,
  NumberInput,
} from "@once-ui-system/core";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import { updateEconomySettings } from "./actions";
import { GuildActionState } from "@/types/dashboard";

import type { GuildSchema } from "@/lib/db/types";
import { useRouter } from "next/navigation";
import { EmojiPickerDropdown } from "@/components/dashboard/discord/EmojiPickerDropdown";
import { emojiFromString, formatCustomEmojiString, isUnicodeEmoji } from "@/lib/discord/emojis-api";
import { Section } from "@/components/dashboard/Section";
import { useT } from "@/i18n/client";
import styles from "./EconomyForm.module.scss";

type Form = Pick<GuildSchema["economy"], "income" | "currency">;

export function EconomyForm({
  guildId,
  defaultIncome,
  defaultCurrency,
}: { guildId: string; defaultIncome: Form["income"]; defaultCurrency: Form["currency"] }) {
  const t = useT();
  const router = useRouter();
  const { setIsDirty, setSaveAction, setCancelAction } = useUnsavedChanges();
  const { addToast } = useToast();

  const [income, setIncome] = useState<Form["income"]>(defaultIncome);
  const [currency, setCurrency] = useState<Form["currency"]>(defaultCurrency);

  const [baseline, setBaseline] = useState<Form>(() => ({
    income: defaultIncome,
    currency: defaultCurrency,
  }));

  const sameAsBaseline = useMemo(
    () => income === baseline.income && currency === baseline.currency,
    [income, currency, baseline],
  );

  useEffect(() => {
    setIsDirty(!sameAsBaseline);
  }, [sameAsBaseline, setIsDirty]);

  const handleSave = useCallback(async () => {
    const fd = new FormData();
    fd.set("guildId", guildId);
    fd.set("income", JSON.stringify(income));
    fd.set("currency", JSON.stringify(currency));

    const result: GuildActionState = await updateEconomySettings(guildId, fd);
    if (!result) {
      addToast({ variant: "danger", message: t("settings.shared.noResponse") });
      return;
    }
    if (result.ok) {
      setIncome(income);
      setCurrency(currency);
      setBaseline({
        income,
        currency,
      });
      router.refresh();
      addToast({ variant: "success", message: t("settings.shared.saveSuccess") });
      return;
    }
    addToast({ variant: "danger", message: result.error ?? t("settings.shared.saveFailed") });
  }, [guildId, income, currency, router, addToast, t]);

  const handleCancel = useCallback(() => {
    setIncome(baseline.income);
    setCurrency(baseline.currency);
  }, [baseline]);

  useEffect(() => {
    setSaveAction(handleSave);
    setCancelAction(handleCancel);
    return () => {
      setSaveAction(null);
      setCancelAction(null);
    };
  }, [handleSave, handleCancel, setSaveAction, setCancelAction]);

  useEffect(() => {
    return () => {
      setIsDirty(false);
    };
  }, [setIsDirty]);

  const setWork = (patch: Partial<Form["income"]["work"]>) =>
    setIncome((prev) => ({ ...prev, work: { ...prev.work, ...patch } }));
  const setRob = (patch: Partial<Form["income"]["rob"]>) =>
    setIncome((prev) => ({ ...prev, rob: { ...prev.rob, ...patch } }));
  const setRobIncome = (patch: Partial<Form["income"]["rob"]["income"]>) =>
    setIncome((prev) => ({ ...prev, rob: { ...prev.rob, income: { ...prev.rob.income, ...patch } } }));
  const setRobPunishment = (patch: Partial<Form["income"]["rob"]["punishment"]>) =>
    setIncome((prev) => ({
      ...prev,
      rob: { ...prev.rob, punishment: { ...prev.rob.punishment, ...patch } },
    }));

  return (
    <div className={styles.layout}>
      <aside className={styles.aside}>
        <Section
          title={t("settings.economy.currencyTitle")}
          description={t("settings.economy.currencyDescription")}
          num={1}
          icon="money"
        >
          <Flex direction="column" gap="8">
            <div className={styles.currencyRow}>
              <div className={styles.currencyInput}>
                <Input
                  id={"currency-emoji"}
                  label={t("settings.economy.currencyLabel")}
                  value={currency?.emoji || ""}
                  onChange={(e) => {
                    const val = e.currentTarget.value;
                    isUnicodeEmoji(val)
                      ? setCurrency({ id: null, emoji: val })
                      : setCurrency({ id: emojiFromString(val).id, emoji: val });
                  }}
                />
              </div>
              <EmojiPickerDropdown
                guildId={guildId}
                onSelect={(emoji) =>
                  setCurrency({
                    id: emoji.id,
                    emoji: formatCustomEmojiString(emoji),
                  })
                }
              />
            </div>
            <Text variant="body-default-s" onBackground="neutral-weak">
              {t("settings.economy.currencyHint")}
            </Text>
          </Flex>
        </Section>
      </aside>

      <div className={styles.main}>
        <Section
          title={t("settings.economy.incomeTitle")}
          description={t("settings.economy.incomeDescription")}
          num={2}
          icon="diamond"
        >
          <div className={styles.incomeGrid}>
            <IncomeCard
              title={t("settings.economy.workTitle")}
              description={t("settings.economy.workDescription")}
              enabled={income.work.enabled}
              onToggle={() => setWork({ enabled: !income.work.enabled })}
            >
              <div className={styles.fields}>
                <NumberInput
                  id={"work-min-income"}
                  label={t("settings.economy.minIncome")}
                  value={income.work.min}
                  onChange={(value) => setWork({ min: Number(value) })}
                  min={0}
                  max={10000}
                  step={1}
                />
                <NumberInput
                  id={"work-max-income"}
                  label={t("settings.economy.maxIncome")}
                  value={income.work.max}
                  onChange={(value) => setWork({ max: Number(value) })}
                  min={0}
                  max={100000}
                  step={1}
                />
                <NumberInput
                  id={"work-cooldown-income"}
                  label={t("settings.economy.cooldown")}
                  value={income.work.cooldown}
                  onChange={(value) => setWork({ cooldown: Number(value) })}
                  min={0}
                  max={86400}
                  step={1}
                />
              </div>
            </IncomeCard>

            <IncomeCard
              className={styles.rob}
              title={t("settings.economy.robTitle")}
              description={t("settings.economy.robDescription")}
              enabled={income.rob.enabled}
              onToggle={() => setRob({ enabled: !income.rob.enabled })}
            >
              <Text variant="label-default-xs" onBackground="neutral-weak" className={styles.groupLabel}>
                {t("settings.economy.income")}
              </Text>
              <SegmentedControl
                defaultValue={income.rob.income.type}
                buttons={[
                  { value: "fixed", label: t("settings.economy.fixed") },
                  { value: "percentage", label: t("settings.economy.percentage") },
                ]}
                onChange={(value) => setRobIncome({ type: value as "fixed" | "percentage" })}
              />
              <div className={styles.fields}>
                <NumberInput
                  id={"rob-min-income"}
                  label={t("settings.economy.minIncome")}
                  value={income.rob.income.min}
                  onChange={(value) => setRobIncome({ min: Number(value) })}
                  min={0}
                  max={10000}
                  step={1}
                />
                <NumberInput
                  id={"rob-max-income"}
                  label={t("settings.economy.maxIncome")}
                  value={income.rob.income.max}
                  onChange={(value) => setRobIncome({ max: Number(value) })}
                  min={0}
                  max={100000}
                  step={1}
                />
                <NumberInput
                  id={"rob-cooldown-income"}
                  label={t("settings.economy.cooldown")}
                  value={income.rob.cooldown}
                  onChange={(value) => setRob({ cooldown: Number(value) })}
                  min={0}
                  max={86400}
                  step={1}
                />
              </div>
              <Line />
              <Text variant="label-default-xs" onBackground="neutral-weak" className={styles.groupLabel}>
                {t("settings.economy.punishmentGroup")}
              </Text>
              <SegmentedControl
                defaultValue={income.rob.punishment.type}
                buttons={[
                  { value: "fixed", label: t("settings.economy.fixed") },
                  { value: "percentage", label: t("settings.economy.percentage") },
                ]}
                onChange={(value) => setRobPunishment({ type: value as "fixed" | "percentage" })}
              />
              <div className={styles.fields}>
                <NumberInput
                  id={"rob-min-punishment"}
                  label={t("settings.economy.minPunishment")}
                  value={income.rob.punishment.min}
                  onChange={(value) => setRobPunishment({ min: Number(value) })}
                  min={0}
                  max={10000}
                  step={1}
                />
                <NumberInput
                  id={"rob-max-punishment"}
                  label={t("settings.economy.maxPunishment")}
                  value={income.rob.punishment.max}
                  onChange={(value) => setRobPunishment({ max: Number(value) })}
                  min={0}
                  max={100000}
                  step={1}
                />
              </div>
              <div className={styles.chance}>
                <div className={styles.chanceNumbers}>
                  <Column center>
                    <Text variant="body-strong-xl" onBackground="brand-weak">
                      {income.rob.punishment.fail_chance}%
                    </Text>
                    <Text variant="body-default-xs" onBackground="neutral-weak">
                      {t("settings.economy.failChance")}
                    </Text>
                  </Column>
                  <Column center>
                    <Text variant="body-strong-xl" onBackground="neutral-weak">
                      {100 - income.rob.punishment.fail_chance}%
                    </Text>
                    <Text variant="body-default-xs" onBackground="neutral-weak">
                      {t("settings.economy.winChance")}
                    </Text>
                  </Column>
                </div>
                <Slider
                  value={income.rob.punishment.fail_chance}
                  onChange={(value) => setRobPunishment({ fail_chance: value })}
                  min={5}
                  max={95}
                  step={1}
                />
              </div>
            </IncomeCard>

            <IncomeCard
              title={t("settings.economy.timelyTitle")}
              description={t("settings.economy.timelyDescription")}
              enabled={income.timely.enabled}
              onToggle={() =>
                setIncome((prev) => ({
                  ...prev,
                  timely: { ...prev.timely, enabled: !prev.timely.enabled },
                }))
              }
            >
              <NumberInput
                id={"timely-income"}
                label={t("settings.economy.income")}
                value={income.timely.amount}
                onChange={(value) =>
                  setIncome((prev) => ({
                    ...prev,
                    timely: { ...prev.timely, amount: Number(value) },
                  }))
                }
                min={0}
                max={100}
                step={1}
              />
            </IncomeCard>

            <IncomeCard
              title={t("settings.economy.dailyTitle")}
              description={t("settings.economy.dailyDescription")}
              enabled={income.daily.enabled}
              onToggle={() =>
                setIncome((prev) => ({
                  ...prev,
                  daily: { ...prev.daily, enabled: !prev.daily.enabled },
                }))
              }
            >
              <NumberInput
                id={"daily-income"}
                label={t("settings.economy.income")}
                value={income.daily.amount}
                onChange={(value) =>
                  setIncome((prev) => ({
                    ...prev,
                    daily: { ...prev.daily, amount: Number(value) },
                  }))
                }
                min={0}
                max={100}
                step={1}
              />
            </IncomeCard>

            <IncomeCard
              title={t("settings.economy.weeklyTitle")}
              description={t("settings.economy.weeklyDescription")}
              enabled={income.weekly.enabled}
              onToggle={() =>
                setIncome((prev) => ({
                  ...prev,
                  weekly: { ...prev.weekly, enabled: !prev.weekly.enabled },
                }))
              }
            >
              <NumberInput
                id={"weekly-income"}
                label={t("settings.economy.income")}
                value={income.weekly.amount}
                onChange={(value) =>
                  setIncome((prev) => ({
                    ...prev,
                    weekly: { ...prev.weekly, amount: Number(value) },
                  }))
                }
                min={0}
                max={100}
                step={1}
              />
            </IncomeCard>
          </div>
        </Section>
      </div>
    </div>
  );
}

/** One income type: title, description, enable switch and its fields. */
function IncomeCard({
  title,
  description,
  enabled,
  onToggle,
  className,
  children,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Column
      className={[styles.subcard, className].filter(Boolean).join(" ")}
      background="overlay"
      border="neutral-medium"
      radius="m"
      padding="16"
      gap="12"
    >
      <div className={styles.subcardHead}>
        <Column gap="4" className={styles.subcardText}>
          <Text variant="body-strong-m">{title}</Text>
          <Text variant="body-default-xs" onBackground="neutral-weak">
            {description}
          </Text>
        </Column>
        <Switch checked={enabled} onToggle={onToggle} />
      </div>
      {children}
    </Column>
  );
}
