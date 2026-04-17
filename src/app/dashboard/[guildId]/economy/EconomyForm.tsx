"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Flex,
  Text,
  Input,
  Row,
  Media,
  Column,
  Switch,
  SegmentedControl,
  Slider,
  useToast,
} from "@once-ui-system/core";
import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import { updateEconomySettings } from "./actions";
import { GuildActionState } from "@/types/dashboard";

import type { GuildSchema } from "@/lib/db/types";
import { useRouter } from "next/navigation";
import { EmojiPickerDropdown } from "@/components/dashboard/discord/EmojiPickerDropdown";
import { emojiFromString, formatCustomEmojiString, isUnicodeEmoji } from "@/lib/discord/emojis-api";

type Form = Pick<GuildSchema["economy"], "income" | "currency">;

export function EconomyForm({
  guildId,
  defaultIncome,
  defaultCurrency,
}: { guildId: string; defaultIncome: Form["income"]; defaultCurrency: Form["currency"] }) {
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
      addToast({ variant: "danger", message: "No response from server" });
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
      addToast({ variant: "success", message: "Successfully updated settings" });
      return;
    }
    addToast({ variant: "danger", message: result.error ?? "Cannot save settings" });
  }, [guildId, income, currency, router]);

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
    <Flex direction="column" gap="24">
      <Flex direction="column" gap="8">
        <Text variant="heading-strong-l">General economy settings</Text>
        <Text variant="body-default-m" onBackground="neutral-medium">
          Configure the basic settings of your guild's economy, such as the income from commands and
          currency emoji.
        </Text>
      </Flex>

      <Flex
        direction="column"
        gap="16"
        padding="24"
        border="neutral-weak"
        radius="l"
        background="surface"
      >
        <Flex direction="column" gap="8">
          <Text variant="body-strong-l">Currency emoji</Text>
          <Text variant="body-default-s" onBackground="neutral-medium">
            This emoji will be used to represent your currency across the bot, such as in the
            balance command and shop listings.
          </Text>
        </Flex>

        <Flex direction="column" gap="8">
          <Row gap={"12"} vertical={"center"} horizontal={"between"}>
            <Input
              id={"currency-emoji"}
              label={"Currency emoji"}
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
            You can use either a custom emoji from your server or a standard Unicode emoji.
          </Text>
        </Flex>
      </Flex>

      <Flex
        direction="column"
        gap="16"
        padding="24"
        border="neutral-weak"
        radius="l"
        background="surface"
      >
        <Flex direction="column" gap="8">
          <Text variant="body-strong-l">Income from work</Text>
          <Text variant="body-default-s" onBackground="neutral-medium">
            Set the amount of currency users will earn.
          </Text>
        </Flex>

        <Column
          background={"overlay"}
          border={"neutral-medium"}
          radius={"m"}
          padding={"20"}
          gap={"12"}
        >
          <Row horizontal={"between"} vertical={"center"}>
            <Column>
              <Text variant="body-strong-m">Regular work</Text>
              <Text variant="body-default-xs" onBackground="neutral-weak">
                The amount of currency users will earn each time they use the work command.
              </Text>
            </Column>
            <Switch
              isChecked={income.work.enabled}
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
              <Input
                id={"work-min-income"}
                label={"Min Income"}
                value={income.work.min}
                onChange={(e) =>
                  setIncome((prev) => ({
                    ...prev,
                    work: { ...prev.work, min: Number(e.target.value) },
                  }))
                }
                min={0}
                max={10000}
                step={1}
              />
              <Input
                id={"work-max-income"}
                label={"Max Income"}
                value={income.work.max}
                onChange={(e) =>
                  setIncome((prev) => ({
                    ...prev,
                    work: { ...prev.work, max: Number(e.target.value) },
                  }))
                }
                min={0}
                max={100000}
                step={1}
              />
            </Row>
            <Input
              id={"work-cooldown-income"}
              label={"Cooldown (s)"}
              value={income.work.cooldown}
              onChange={(e) =>
                setIncome((prev) => ({
                  ...prev,
                  work: { ...prev.work, cooldown: Number(e.target.value) },
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
              <Text variant="body-strong-m">Robbing</Text>
              <Text variant="body-default-xs" onBackground="neutral-weak">
                The amount of currency users will earn each time they use the rob command.
              </Text>
            </Column>
            <Switch
              isChecked={income.rob.enabled}
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
                { value: "fixed", label: "Fixed (0)" },
                { value: "percentage", label: "Percentage (%)" },
              ]}
              onToggle={(value) =>
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
                <Input
                  id={"rob-min-income"}
                  label={"Min Income"}
                  value={income.rob.income.min}
                  onChange={(e) =>
                    setIncome((prev) => ({
                      ...prev,
                      rob: {
                        ...prev.rob,
                        income: { ...prev.rob.income, min: Number(e.target.value) },
                      },
                    }))
                  }
                  min={0}
                  max={10000}
                  step={1}
                />
                <Input
                  id={"rob-max-income"}
                  label={"Max Income"}
                  value={income.rob.income.max}
                  onChange={(e) =>
                    setIncome((prev) => ({
                      ...prev,
                      rob: {
                        ...prev.rob,
                        income: { ...prev.rob.income, max: Number(e.target.value) },
                      },
                    }))
                  }
                  min={0}
                  max={100000}
                  step={1}
                />
              </Row>
              <Input
                id={"rob-cooldown-income"}
                label={"Cooldown (s)"}
                value={income.rob.cooldown}
                onChange={(e) =>
                  setIncome((prev) => ({
                    ...prev,
                    rob: { ...prev.rob, cooldown: Number(e.target.value) },
                  }))
                }
                min={0}
                max={86400}
                step={1}
              />
            </Column>
            <SegmentedControl
              buttons={[
                { value: "fixed", label: "Fixed (0)" },
                { value: "percentage", label: "Percentage (%)" },
              ]}
              onToggle={(value) =>
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
                <Input
                  id={"rob-min-punishment"}
                  label={"Min Punishment"}
                  value={income.rob.punishment.min}
                  onChange={(e) =>
                    setIncome((prev) => ({
                      ...prev,
                      rob: {
                        ...prev.rob,
                        punishment: { ...prev.rob.punishment, min: Number(e.target.value) },
                      },
                    }))
                  }
                  min={0}
                  max={10000}
                  step={1}
                />
                <Input
                  id={"rob-max-punishment"}
                  label={"Max Punishment"}
                  value={income.rob.punishment.max}
                  onChange={(e) =>
                    setIncome((prev) => ({
                      ...prev,
                      rob: {
                        ...prev.rob,
                        punishment: { ...prev.rob.punishment, max: Number(e.target.value) },
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
                      Chance of failure
                    </Text>
                  </Column>
                  <Column center>
                    <Text variant="body-strong-xl" onBackground="neutral-weak">
                      {100 - income.rob.punishment.fail_chance}%
                    </Text>
                    <Text variant="body-default-xs" onBackground="neutral-weak">
                      Chance of win
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
              <Text variant="body-strong-m">Timely</Text>
              <Text variant="body-default-xs" onBackground="neutral-weak">
                The amount of currency users will earn each time they use the timely command.
              </Text>
            </Column>
            <Switch
              isChecked={income.timely.enabled}
              onToggle={() =>
                setIncome((prev) => ({
                  ...prev,
                  timely: { ...prev.timely, enabled: !income.timely.enabled },
                }))
              }
            />
          </Row>
          <Input
            id={"timely-income"}
            label={"Income"}
            value={income.timely.amount}
            onChange={(e) =>
              setIncome((prev) => ({
                ...prev,
                timely: { ...prev.timely, amount: Number(e.target.value) },
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
              <Text variant="body-strong-m">Daily</Text>
              <Text variant="body-default-xs" onBackground="neutral-weak">
                The amount of currency users will earn each time they use the daily command.
              </Text>
            </Column>
            <Switch
              isChecked={income.daily.enabled}
              onToggle={() =>
                setIncome((prev) => ({
                  ...prev,
                  daily: { ...prev.daily, enabled: !income.daily.enabled },
                }))
              }
            />
          </Row>
          <Input
            id={"daily-income"}
            label={"Income"}
            value={income.daily.amount}
            onChange={(e) =>
              setIncome((prev) => ({
                ...prev,
                daily: { ...prev.daily, amount: Number(e.target.value) },
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
              <Text variant="body-strong-m">Weekly</Text>
              <Text variant="body-default-xs" onBackground="neutral-weak">
                The amount of currency users will earn each time they use the weekly command.
              </Text>
            </Column>
            <Switch
              isChecked={income.weekly.enabled}
              onToggle={() =>
                setIncome((prev) => ({
                  ...prev,
                  weekly: { ...prev.weekly, enabled: !income.weekly.enabled },
                }))
              }
            />
          </Row>
          <Input
            id={"weekly-income"}
            label={"Income"}
            value={income.weekly.amount}
            onChange={(e) =>
              setIncome((prev) => ({
                ...prev,
                weekly: { ...prev.weekly, amount: Number(e.target.value) },
              }))
            }
            min={0}
            max={100}
            step={1}
          />
        </Column>
      </Flex>
    </Flex>
  );
}
