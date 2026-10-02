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
  useToast,
  NumberInput,
  RevealFx,
} from "@once-ui-system/core";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import { updateEconomySettings } from "./actions";
import { GuildActionState } from "@/types/dashboard";

import type { GuildSchema } from "@/lib/db/types";
import { useRouter } from "next/navigation";
import { EmojiPickerDropdown } from "@/components/dashboard/discord/EmojiPickerDropdown";
import { emojiFromString, formatCustomEmojiString, isUnicodeEmoji } from "@/lib/discord/emojis-api";
import { DashIcon } from "@/components/dashboard/DashIcon";
import { Section } from "@/components/dashboard/Section";
import { useT } from "@/i18n/client";

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

  return (
    <>
      <Section
        title={t("settings.economy.currencyTitle")}
        description={t("settings.economy.currencyDescription")}
        num={1}
        icon="money"
      >
        <Flex direction="column" gap="8">
          <Row gap={"12"} vertical={"center"} horizontal={"between"}>
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
            <EmojiPickerDropdown
              guildId={guildId}
              onSelect={(emoji) =>
                setCurrency({
                  id: emoji.id,
                  emoji: formatCustomEmojiString(emoji),
                })
              }
            />
          </Row>
          <Text variant="body-default-s" onBackground="neutral-weak">
            {t("settings.economy.currencyHint")}
          </Text>
        </Flex>
      </Section>

      <Section
        title={t("settings.economy.incomeTitle")}
        description={t("settings.economy.incomeDescription")}
        num={2}
        icon="diamond"
      >
        <Column
          background={"overlay"}
          border={"neutral-medium"}
          radius={"m"}
          padding={"20"}
          gap={"12"}
        >
          <Row horizontal={"between"} vertical={"center"}>
            <Column>
              <Text variant="body-strong-m">{t("settings.economy.workTitle")}</Text>
              <Text variant="body-default-xs" onBackground="neutral-weak">
                {t("settings.economy.workDescription")}
              </Text>
            </Column>
            <Switch
              checked={income.work.enabled}
              onToggle={() =>
                setIncome((prev) => ({
                  ...prev,
                  work: { ...prev.work, enabled: !income.work.enabled },
                }))
              }
            />
          </Row>
          <Column gap={"8"}>
            <Row gap={"8"}>
              <NumberInput
                id={"work-min-income"}
                label={t("settings.economy.minIncome")}
                value={income.work.min}
                onChange={(value) =>
                  setIncome((prev) => ({
                    ...prev,
                    work: { ...prev.work, min: Number(value) },
                  }))
                }
                min={0}
                max={10000}
                step={1}
              />
              <NumberInput
                id={"work-max-income"}
                label={t("settings.economy.maxIncome")}
                value={income.work.max}
                onChange={(value) =>
                  setIncome((prev) => ({
                    ...prev,
                    work: { ...prev.work, max: Number(value) },
                  }))
                }
                min={0}
                max={100000}
                step={1}
              />
            </Row>
            <NumberInput
              id={"work-cooldown-income"}
              label={t("settings.economy.cooldown")}
              value={income.work.cooldown}
              onChange={(value) =>
                setIncome((prev) => ({
                  ...prev,
                  work: { ...prev.work, cooldown: Number(value) },
                }))
              }
              min={0}
              max={86400}
              step={1}
            />
          </Column>
        </Column>

        <Column
          background={"overlay"}
          border={"neutral-medium"}
          radius={"m"}
          padding={"20"}
          gap={"12"}
        >
          <Row horizontal={"between"} vertical={"center"}>
            <Column>
              <Text variant="body-strong-m">{t("settings.economy.robTitle")}</Text>
              <Text variant="body-default-xs" onBackground="neutral-weak">
                {t("settings.economy.robDescription")}
              </Text>
            </Column>
            <Switch
              checked={income.rob.enabled}
              onToggle={() =>
                setIncome((prev) => ({
                  ...prev,
                  rob: { ...prev.rob, enabled: !income.rob.enabled },
                }))
              }
            />
          </Row>
          <Column gap={"12"}>
            <SegmentedControl
              buttons={[
                { value: "fixed", label: t("settings.economy.fixed") },
                { value: "percentage", label: t("settings.economy.percentage") },
              ]}
              onChange={(value) =>
                setIncome((prev) => ({
                  ...prev,
                  rob: {
                    ...prev.rob,
                    income: { ...prev.rob.income, type: value as "fixed" | "percentage" },
                  },
                }))
              }
            />
            <Column gap={"8"}>
              <Row gap={"8"}>
                <NumberInput
                  id={"rob-min-income"}
                  label={t("settings.economy.minIncome")}
                  value={income.rob.income.min}
                  onChange={(value) =>
                    setIncome((prev) => ({
                      ...prev,
                      rob: {
                        ...prev.rob,
                        income: { ...prev.rob.income, min: Number(value) },
                      },
                    }))
                  }
                  min={0}
                  max={10000}
                  step={1}
                />
                <NumberInput
                  id={"rob-max-income"}
                  label={t("settings.economy.maxIncome")}
                  value={income.rob.income.max}
                  onChange={(value) =>
                    setIncome((prev) => ({
                      ...prev,
                      rob: {
                        ...prev.rob,
                        income: { ...prev.rob.income, max: Number(value) },
                      },
                    }))
                  }
                  min={0}
                  max={100000}
                  step={1}
                />
              </Row>
              <NumberInput
                id={"rob-cooldown-income"}
                label={t("settings.economy.cooldown")}
                value={income.rob.cooldown}
                onChange={(value) =>
                  setIncome((prev) => ({
                    ...prev,
                    rob: { ...prev.rob, cooldown: Number(value) },
                  }))
                }
                min={0}
                max={86400}
                step={1}
              />
            </Column>
            <SegmentedControl
              buttons={[
                { value: "fixed", label: t("settings.economy.fixed") },
                { value: "percentage", label: t("settings.economy.percentage") },
              ]}
              onChange={(value) =>
                setIncome((prev) => ({
                  ...prev,
                  rob: {
                    ...prev.rob,
                    punishment: { ...prev.rob.punishment, type: value as "fixed" | "percentage" },
                  },
                }))
              }
            />
            <Column gap={"8"}>
              <Row gap={"8"}>
                <NumberInput
                  id={"rob-min-punishment"}
                  label={t("settings.economy.minPunishment")}
                  value={income.rob.punishment.min}
                  onChange={(value) =>
                    setIncome((prev) => ({
                      ...prev,
                      rob: {
                        ...prev.rob,
                        punishment: { ...prev.rob.punishment, min: Number(value) },
                      },
                    }))
                  }
                  min={0}
                  max={10000}
                  step={1}
                />
                <NumberInput
                  id={"rob-max-punishment"}
                  label={t("settings.economy.maxPunishment")}
                  value={income.rob.punishment.max}
                  onChange={(value) =>
                    setIncome((prev) => ({
                      ...prev,
                      rob: {
                        ...prev.rob,
                        punishment: { ...prev.rob.punishment, max: Number(value) },
                      },
                    }))
                  }
                  min={0}
                  max={100000}
                  step={1}
                />
              </Row>
              <Column paddingX={"xs"}>
                <Row horizontal={"between"} vertical={"center"} paddingX={"xs"}>
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
                </Row>
                <Slider
                  value={income.rob.punishment.fail_chance}
                  onChange={(value) =>
                    setIncome((prev) => ({
                      ...prev,
                      rob: {
                        ...prev.rob,
                        punishment: { ...prev.rob.punishment, fail_chance: value },
                      },
                    }))
                  }
                  min={5}
                  max={95}
                  step={1}
                />
              </Column>
            </Column>
          </Column>
        </Column>

        <Column
          background={"overlay"}
          border={"neutral-medium"}
          radius={"m"}
          padding={"20"}
          gap={"12"}
        >
          <Row horizontal={"between"} vertical={"center"}>
            <Column>
              <Text variant="body-strong-m">{t("settings.economy.timelyTitle")}</Text>
              <Text variant="body-default-xs" onBackground="neutral-weak">
                {t("settings.economy.timelyDescription")}
              </Text>
            </Column>
            <Switch
              checked={income.timely.enabled}
              onToggle={() =>
                setIncome((prev) => ({
                  ...prev,
                  timely: { ...prev.timely, enabled: !income.timely.enabled },
                }))
              }
            />
          </Row>
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
        </Column>

        <Column
          background={"overlay"}
          border={"neutral-medium"}
          radius={"m"}
          padding={"20"}
          gap={"12"}
        >
          <Row horizontal={"between"} vertical={"center"}>
            <Column>
              <Text variant="body-strong-m">{t("settings.economy.dailyTitle")}</Text>
              <Text variant="body-default-xs" onBackground="neutral-weak">
                {t("settings.economy.dailyDescription")}
              </Text>
            </Column>
            <Switch
              checked={income.daily.enabled}
              onToggle={() =>
                setIncome((prev) => ({
                  ...prev,
                  daily: { ...prev.daily, enabled: !income.daily.enabled },
                }))
              }
            />
          </Row>
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
        </Column>

        <Column
          background={"overlay"}
          border={"neutral-medium"}
          radius={"m"}
          padding={"20"}
          gap={"12"}
        >
          <Row horizontal={"between"} vertical={"center"}>
            <Column>
              <Text variant="body-strong-m">{t("settings.economy.weeklyTitle")}</Text>
              <Text variant="body-default-xs" onBackground="neutral-weak">
                {t("settings.economy.weeklyDescription")}
              </Text>
            </Column>
            <Switch
              checked={income.weekly.enabled}
              onToggle={() =>
                setIncome((prev) => ({
                  ...prev,
                  weekly: { ...prev.weekly, enabled: !income.weekly.enabled },
                }))
              }
            />
          </Row>
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
        </Column>
      </Section>
    </>
  );
}
