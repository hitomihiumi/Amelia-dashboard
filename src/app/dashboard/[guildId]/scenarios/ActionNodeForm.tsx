"use client";

import { LabelSelect } from "@/components/dashboard/discord/LabelSelect";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import type {
  IModalField,
  ScenarioAction,
  ScenarioCondition,
  ScenarioConditionOperator,
  ScenarioConditionType,
  ScenarioStep,
} from "@/lib/db/types";
import type { GuildChannelOption } from "@/lib/discord/channels-api";
import type { DiscordRole } from "@/lib/discord/role-style";
import {
  Button,
  Column,
  Feedback,
  IconButton,
  Input,
  NumberInput,
  Row,
  SegmentedControl,
  Switch,
  Text,
  Textarea,
} from "@once-ui-system/core";
import React from "react";
import { LuLayoutTemplate } from "react-icons/lu";
import { layoutReferenceProblems, summarizeLayout } from "./layoutSummary";
import { ACTION_LABELS } from "./scenarioGraph";
import type { ComponentsLibrary } from "./scenariosTypes";

const CONDITION_OPERATOR_LABEL: Record<ScenarioConditionOperator, MessageKey> = {
  equals: "builder.conditions.operators.equals",
  not_equals: "builder.conditions.operators.not_equals",
  contains: "builder.conditions.operators.contains",
  not_contains: "builder.conditions.operators.not_contains",
  starts_with: "builder.conditions.operators.starts_with",
  ends_with: "builder.conditions.operators.ends_with",
  greater_than: "builder.conditions.operators.greater_than",
  less_than: "builder.conditions.operators.less_than",
  has_role: "builder.conditions.operators.has_role",
  not_has_role: "builder.conditions.operators.not_has_role",
  in_channel: "builder.conditions.operators.in_channel",
  not_in_channel: "builder.conditions.operators.not_in_channel",
  is_empty: "builder.conditions.operators.is_empty",
  is_not_empty: "builder.conditions.operators.is_not_empty",
};

const CONDITION_TYPE_LABEL: Record<ScenarioConditionType, MessageKey> = {
  user: "builder.conditions.types.user",
  input: "builder.conditions.types.input",
  variable: "builder.conditions.types.variable",
  role: "builder.conditions.types.role",
  channel: "builder.conditions.types.channel",
  selected: "builder.conditions.types.selected",
};

const CONDITION_OPERATORS: ScenarioConditionOperator[] = [
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "starts_with",
  "ends_with",
  "greater_than",
  "less_than",
  "has_role",
  "not_has_role",
  "in_channel",
  "not_in_channel",
  "is_empty",
  "is_not_empty",
];
const CONDITION_TYPES: ScenarioConditionType[] = [
  "user",
  "input",
  "variable",
  "role",
  "channel",
  "selected",
];

export interface ActionNodeFormProps {
  guildId: string;
  step: ScenarioStep;
  library: ComponentsLibrary;
  roles: DiscordRole[];
  channels: GuildChannelOption[];
  /** Fields of the modal that triggers this scenario, when the trigger is a modal submit. */
  triggerModalFields?: IModalField[];
  onUpdate: (action: ScenarioAction) => void;
  onUpdateMeta: (patch: Partial<ScenarioStep>) => void;
}

export function ActionNodeForm({
  guildId,
  step,
  library,
  roles,
  channels,
  triggerModalFields,
  onUpdate,
  onUpdateMeta,
}: ActionNodeFormProps) {
  const t = useT();
  const action = step.action;
  const update = (patch: Partial<ScenarioAction>) => onUpdate({ ...action, ...patch });

  return (
    <Column gap="12" fillWidth padding="12" border="neutral-weak" radius="m" background="surface">
      <Text variant="label-strong-s">{t(ACTION_LABELS[action.type])}</Text>
      <Input
        id={`${step.id}-stepname`}
        label={t("builder.actions.stepName")}
        value={step.name ?? ""}
        onChange={(e) => onUpdateMeta({ name: e.target.value })}
      />
      <ActionBody
        action={action}
        library={library}
        roles={roles}
        channels={channels}
        guildId={guildId}
        update={update}
      />

      <ConditionsEditor
        step={step}
        onUpdate={onUpdateMeta}
        triggerModalFields={triggerModalFields}
      />
      <Switch
        label={t("builder.actions.stopOnFailure")}
        description={t("builder.actions.stopOnFailureHint")}
        checked={!!step.stopOnFailure}
        onToggle={() => onUpdateMeta({ stopOnFailure: !step.stopOnFailure })}
      />
    </Column>
  );
}

function ActionBody({
  action,
  library,
  roles,
  channels,
  guildId,
  update,
}: {
  action: ScenarioAction;
  library: ComponentsLibrary;
  roles: DiscordRole[];
  channels: GuildChannelOption[];
  guildId: string;
  update: (patch: Partial<ScenarioAction>) => void;
}) {
  const t = useT();
  switch (action.type) {
    case "reply":
    case "send_message":
    case "edit_message":
    case "send_embed":
    case "send_dm":
      return (
        <MessageActionFields
          action={action}
          library={library}
          channels={channels}
          guildId={guildId}
          update={update}
        />
      )
    case "show_modal":
      return (
        <ReferenceField
          label={t("builder.actions.modal")}
          options={library.modals.map((m) => ({
            value: m.id,
            label: m.title || t("builder.fallback.modal"),
          }))}
          value={action.modalId ?? ""}
          onChange={(v) => update({ modalId: v })}
        />
      );
    case "add_role":
    case "remove_role":
      return (
        <ReferenceField
          label={t("builder.actions.role")}
          options={roles.map((r) => ({ value: r.id, label: r.name }))}
          value={action.roleId ?? ""}
          onChange={(v) => update({ roleId: v })}
        />
      );
    case "create_thread":
      return (
        <>
          <ChannelIdField
            channels={channels}
            value={action.channelId ?? ""}
            onChange={(v) => update({ channelId: v || undefined })}
          />
          <Input
            id={`${guildId}-thread-name`}
            label={t("builder.actions.threadName")}
            value={action.threadName ?? ""}
            onChange={(e) => update({ threadName: e.target.value })}
            maxLength={100}
            characterCount
          />
          <SegmentedControl
            fillWidth
            value={String(action.autoArchiveDuration ?? 1440)}
            onChange={(v) => update({ autoArchiveDuration: Number(v) as any })}
            buttons={[
              { label: t("builder.actions.archive1h"), value: "60" },
              { label: t("builder.actions.archive24h"), value: "1440" },
              { label: t("builder.actions.archive3d"), value: "4320" },
              { label: t("builder.actions.archive1w"), value: "10080" },
            ]}
          />
        </>
      );
    case "set_variable":
      return (
        <>
          <Input
            id={`${guildId}-var-name`}
            label={t("builder.actions.variableName")}
            value={action.variableName ?? ""}
            onChange={(e) => update({ variableName: e.target.value })}
            maxLength={32}
          />
          <Textarea
            id={`${guildId}-var-value`}
            label={t("builder.actions.variableValue")}
            value={action.variableValue ?? ""}
            onChange={(e) => update({ variableValue: e.target.value })}
            lines={2}
            maxLength={1000}
            characterCount
            resize="vertical"
          />
        </>
      );
    case "delete_message":
      return (
        <>
          <Switch
            label={t("builder.actions.deleteOriginal")}
            checked={!!action.deleteOriginal}
            onToggle={() => update({ deleteOriginal: !action.deleteOriginal })}
          />
          <NumberInput
            id={`${guildId}-delete-delay`}
            label={t("builder.actions.deleteDelay")}
            min={0}
            max={60000}
            step={100}
            value={action.deleteDelay ?? 0}
            onChange={(v) => update({ deleteDelay: Number(v) || undefined })}
          />
        </>
      );
    default:
      return null;
  }
}

const EPHEMERAL_HINT: Partial<Record<ScenarioAction["type"], MessageKey>> = {
  reply: "builder.actions.ephemeralReplyHint",
  send_message: "builder.actions.ephemeralMessageHint",
  edit_message: "builder.actions.ephemeralMessageHint",
};

/**
 * Every action that posts or edits a message. The "Message type" switch decides whether it
 * sends classic content/embeds/buttons/menus or a Components V2 layout; flipping it only sets
 * or clears `layoutId`, so the fields of the other mode survive a round trip.
 * `layoutId === ""` means "layout mode, nothing picked yet".
 */
function MessageActionFields({
  action,
  library,
  channels,
  guildId,
  update,
}: {
  action: ScenarioAction;
  library: ComponentsLibrary;
  channels: GuildChannelOption[];
  guildId: string;
  update: (patch: Partial<ScenarioAction>) => void;
}) {
  const t = useT();
  const isLayout = action.layoutId != null;
  const hasChannel =
    action.type === "send_message" ||
    action.type === "send_embed" ||
    action.type === "edit_message";
  const ephemeralHint = EPHEMERAL_HINT[action.type];

  const ephemeral = ephemeralHint ? (
    <Switch
      label={t("builder.actions.ephemeral")}
      description={t(ephemeralHint)}
      checked={!!action.ephemeral}
      onToggle={() => update({ ephemeral: !action.ephemeral })}
    />
  ) : null;

  return (
    <>
      {hasChannel && (
        <ChannelIdField
          channels={channels}
          value={action.channelId ?? ""}
          onChange={(v) => update({ channelId: v || undefined })}
        />
      )}

      <Column gap="8" fillWidth>
        <Text variant="label-default-s">{t("builder.actions.messageType.label")}</Text>
        <SegmentedControl
          fillWidth
          value={isLayout ? "layout" : "classic"}
          onChange={(v) => update({ layoutId: v === "layout" ? (action.layoutId ?? "") : undefined })}
          buttons={[
            { label: t("builder.actions.messageType.classic"), value: "classic" },
            { label: t("builder.actions.messageType.layout"), value: "layout" },
          ]}
        />
        <Text variant="body-default-xs" onBackground="neutral-weak">
          {t(
            isLayout
              ? "builder.actions.messageType.layoutHint"
              : "builder.actions.messageType.classicHint",
          )}
        </Text>
      </Column>

      {isLayout ? (
        <>
          <LayoutPicker
            guildId={guildId}
            layoutId={action.layoutId ?? ""}
            library={library}
            onChange={(id) => update({ layoutId: id })}
          />
          {action.type === "edit_message" && (
            <Feedback
              variant="info"
              title={t("builder.actions.layout.editRuleTitle")}
              description={t("builder.actions.layout.editRuleText")}
            />
          )}
          {ephemeral}
        </>
      ) : (
        <ClassicMessageFields
          action={action}
          library={library}
          guildId={guildId}
          update={update}
          ephemeral={ephemeral}
        />
      )}
    </>
  );
}

function ClassicMessageFields({
  action,
  library,
  guildId,
  update,
  ephemeral,
}: {
  action: ScenarioAction;
  library: ComponentsLibrary;
  guildId: string;
  update: (patch: Partial<ScenarioAction>) => void;
  ephemeral: React.ReactNode;
}) {
  const t = useT();

  if (action.type === "send_dm") {
    return (
      <>
        <Textarea
          id={`${guildId}-dm-content`}
          label={t("builder.actions.dmContent")}
          value={action.dmContent ?? ""}
          onChange={(e) => update({ dmContent: e.target.value })}
          lines={3}
          maxLength={2000}
          characterCount
          resize="vertical"
        />
        <ReferenceField
          label={t("builder.actions.dmEmbed")}
          options={library.embed.map((e) => ({
            value: e.id,
            label: e.name || e.title || t("builder.fallback.embed"),
          }))}
          value={action.dmEmbedId ?? ""}
          onChange={(v) => update({ dmEmbedId: v || undefined })}
        />
      </>
    );
  }

  const contentLabel =
    action.type === "reply"
      ? t("builder.actions.replyContent")
      : action.type === "send_embed"
        ? t("builder.actions.messageContentOptional")
        : t("builder.actions.messageContent");
  const compact = action.type === "send_embed";

  return (
    <>
      <Textarea
        id={`${guildId}-${action.type}-content`}
        label={contentLabel}
        value={action.content ?? ""}
        onChange={(e) => update({ content: e.target.value })}
        lines={compact ? 2 : 3}
        maxLength={2000}
        characterCount={!compact}
        resize="vertical"
      />
      {ephemeral}
      <MultiReferences
        label={t("builder.actions.embeds")}
        options={library.embed.map((e) => ({
          value: e.id,
          label: e.name || e.title || t("builder.fallback.embed"),
        }))}
        selected={action.embeds ?? []}
        onToggle={(arr) => update({ embeds: arr })}
      />
      <MultiReferences
        label={t("builder.actions.buttons")}
        options={library.buttons.map((b) => ({ value: b.id, label: b.name || b.label }))}
        selected={action.buttons ?? []}
        onToggle={(arr) => update({ buttons: arr })}
      />
      <MultiReferences
        label={t("builder.actions.selectMenus")}
        options={library.selectMenus.map((s) => ({
          value: s.id,
          label: s.name || s.placeholder || t("builder.fallback.menu"),
        }))}
        selected={action.selectMenus ?? []}
        onToggle={(arr) => update({ selectMenus: arr })}
      />
    </>
  );
}

/** Picker for the layout a message sends, with a compact summary and warnings about broken references. */
function LayoutPicker({
  guildId,
  layoutId,
  library,
  onChange,
}: {
  guildId: string;
  layoutId: string;
  library: ComponentsLibrary;
  onChange: (id: string) => void;
}) {
  const t = useT();
  const layoutsHref = `/dashboard/${guildId}/components?tab=layouts`;
  const layouts = library.layouts;

  if (layouts.length === 0) {
    return (
      <Column
        gap="12"
        fillWidth
        padding="16"
        radius="m"
        horizontal="center"
        align="center"
        border="neutral-medium"
        background="neutral-alpha-weak"
        style={{ borderStyle: "dashed" }}
      >
        <LuLayoutTemplate size={22} aria-hidden />
        <Column gap="4" horizontal="center">
          <Text variant="label-strong-s">{t("builder.actions.layout.emptyTitle")}</Text>
          <Text variant="body-default-s" onBackground="neutral-weak">
            {t("builder.actions.layout.emptyText")}
          </Text>
        </Column>
        <Button size="s" variant="secondary" suffixIcon="arrowUpRight" href={layoutsHref}>
          {t("builder.actions.layout.open")}
        </Button>
      </Column>
    );
  }

  const selected = layouts.find((l) => l.id === layoutId);
  const summary = selected ? summarizeLayout(selected) : null;
  const problems = selected ? layoutReferenceProblems(selected, library) : null;

  return (
    <Column gap="8" fillWidth>
      <LabelSelect
        id={`${guildId}-layout-picker`}
        label={t("builder.actions.layout.label")}
        selectedValue={selected ? selected.id : ""}
        setSelectedValue={(v) => onChange((v as string) ?? "")}
        options={layouts.map((l) => ({
          value: l.id,
          label: l.name || t("builder.fallback.layout"),
          description: t("builder.actions.layout.componentsCount", {
            count: summarizeLayout(l).components,
          }),
        }))}
      />

      {layoutId && !selected && (
        <Feedback variant="warning" description={t("builder.actions.layout.gone")} />
      )}

      {selected && summary && (
        <Column
          gap="8"
          fillWidth
          padding="12"
          radius="m"
          border="neutral-weak"
          background="neutral-alpha-weak"
        >
          <Row gap="8" vertical="center" horizontal="between">
            <Row gap="8" vertical="center" style={{ minWidth: 0 }}>
              <LuLayoutTemplate size={16} aria-hidden style={{ flexShrink: 0 }} />
              <Text variant="label-strong-s" style={{ wordBreak: "break-word" }}>
                {selected.name || t("builder.fallback.layout")}
              </Text>
            </Row>
            <Button
              size="s"
              variant="tertiary"
              suffixIcon="arrowUpRight"
              href={layoutsHref}
            >
              {t("builder.actions.layout.edit")}
            </Button>
          </Row>
          <Text
            variant="body-default-s"
            onBackground="neutral-weak"
            style={{ wordBreak: "break-word", fontStyle: summary.excerpt ? undefined : "italic" }}
          >
            {summary.excerpt ?? t("builder.actions.layout.noText")}
          </Text>
          <Row gap="4" wrap>
            <SummaryChip>
              {t("builder.actions.layout.componentsCount", { count: summary.components })}
            </SummaryChip>
            {summary.buttons > 0 && (
              <SummaryChip>
                {t("builder.actions.layout.buttonsCount", { count: summary.buttons })}
              </SummaryChip>
            )}
            {summary.menus > 0 && (
              <SummaryChip>
                {t("builder.actions.layout.menusCount", { count: summary.menus })}
              </SummaryChip>
            )}
            {summary.images > 0 && (
              <SummaryChip>
                {t("builder.actions.layout.imagesCount", { count: summary.images })}
              </SummaryChip>
            )}
          </Row>
        </Column>
      )}

      {problems && problems.missingRefs > 0 && (
        <Feedback
          variant="warning"
          title={t("builder.actions.layout.missingRefs", { count: problems.missingRefs })}
          description={t("builder.actions.layout.fixInLayouts")}
        />
      )}
      {problems && problems.other > 0 && (
        <Feedback
          variant="warning"
          title={t("builder.actions.layout.otherIssues", { count: problems.other })}
          description={t("builder.actions.layout.fixInLayouts")}
        />
      )}
    </Column>
  );
}

function SummaryChip({ children }: { children: React.ReactNode }) {
  return (
    <Row paddingX="8" paddingY="2" radius="full" border="neutral-weak" background="surface">
      <Text variant="label-default-xs" onBackground="neutral-medium">
        {children}
      </Text>
    </Row>
  );
}

function ChannelIdField({
  channels,
  value,
  onChange,
}: {
  channels: GuildChannelOption[];
  value: string;
  onChange: (v: string) => void;
}) {
  const t = useT();
  return (
    <ReferenceField
      label={t("builder.actions.channel")}
      options={channels.map((c) => ({ value: c.id, label: `#${c.name}` }))}
      value={value}
      onChange={onChange}
    />
  );
}

function ReferenceField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const t = useT();
  if (options.length === 0) {
    return (
      <Column gap="4">
        <Text variant="label-default-s">{label}</Text>
        <Text variant="body-default-s" onBackground="danger-medium">
          {t("builder.actions.noCandidates")}
        </Text>
      </Column>
    );
  }
  return (
    <LabelSelect
      id={`ref-${label}`}
      label={label}
      selectedValue={value}
      setSelectedValue={(v) => onChange((v as string) ?? "")}
      options={options}
    />
  );
}

function MultiReferences({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (arr: string[]) => void;
}) {
  const t = useT();
  if (options.length === 0) {
    return (
      <Column gap="4">
        <Text variant="label-default-s">{label}</Text>
        <Text variant="body-default-s" onBackground="neutral-weak">
          {t("builder.actions.noneAvailable")}
        </Text>
      </Column>
    );
  }
  return (
    <LabelSelect
      id={`multi-${label}`}
      label={label}
      multiple
      selectedValue={selected}
      setSelectedValue={(v) => onToggle((v as string[]) ?? [])}
      options={options}
    />
  );
}

function ConditionsEditor({
  step,
  onUpdate,
  triggerModalFields,
}: {
  step: ScenarioStep;
  onUpdate: (patch: Partial<ScenarioStep>) => void;
  triggerModalFields?: IModalField[];
}) {
  const t = useT();
  const conditions = step.conditions ?? [];
  const logic = step.conditionLogic ?? "and";

  const setConditions = (next: ScenarioCondition[]) => onUpdate({ conditions: next });
  const addCondition = () =>
    setConditions([
      ...conditions,
      { type: "user" as ScenarioConditionType, operator: "equals", value: "" },
    ]);
  const updateCondition = (i: number, patch: Partial<ScenarioCondition>) =>
    setConditions(conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const removeCondition = (i: number) => setConditions(conditions.filter((_, idx) => idx !== i));

  return (
    <Column gap="8" fillWidth padding="8" border="neutral-weak" radius="s">
      <Row fillWidth horizontal="between" vertical="center">
        <Text variant="label-default-s">
          {t("builder.conditions.title", { count: conditions.length })}
        </Text>
        <Button size="s" variant="secondary" prefixIcon="plus" onClick={addCondition}>
          {t("builder.conditions.add")}
        </Button>
      </Row>
      {conditions.length > 0 && (
        <SegmentedControl
          fillWidth
          value={logic}
          onChange={(v) => onUpdate({ conditionLogic: v as "and" | "or" })}
          buttons={[
            { label: t("builder.conditions.logicAnd"), value: "and" },
            { label: t("builder.conditions.logicOr"), value: "or" },
          ]}
        />
      )}
      {conditions.map((c, i) => (
        <ConditionRow
          key={i}
          condition={c}
          onChange={(patch) => updateCondition(i, patch)}
          onDelete={() => removeCondition(i)}
          triggerModalFields={triggerModalFields}
        />
      ))}
    </Column>
  );
}

function ConditionRow({
  condition,
  onChange,
  onDelete,
  triggerModalFields,
}: {
  condition: ScenarioCondition;
  onChange: (patch: Partial<ScenarioCondition>) => void;
  onDelete: () => void;
  triggerModalFields?: IModalField[];
}) {
  const t = useT();
  return (
    <Column gap="4" fillWidth padding={6} border="neutral-weak" radius="s" background="surface">
      <Row fillWidth gap="4" horizontal="between" vertical="center">
        <LabelSelect
          id="cond-type"
          label={t("builder.conditions.type")}
          selectedValue={condition.type}
          setSelectedValue={(v) => onChange({ type: v as string as ScenarioConditionType })}
          options={CONDITION_TYPES.map((type) => ({
            value: type,
            label: t(CONDITION_TYPE_LABEL[type]),
          }))}
        />
        <IconButton icon="trash" variant="ghost" size="s" tooltip={t("builder.conditions.remove")} onClick={onDelete} />
      </Row>
      {condition.type === "variable" && (
        <Input
          id="cond-field-variable"
          label={t("builder.conditions.variableName")}
          value={condition.field ?? ""}
          onChange={(e) => onChange({ field: e.target.value })}
        />
      )}
      {condition.type === "input" &&
        (triggerModalFields && triggerModalFields.length > 0 ? (
          <LabelSelect
            id="cond-field-input"
            label={t("builder.conditions.modalField")}
            selectedValue={condition.field ?? ""}
            setSelectedValue={(v) => onChange({ field: (v as string) ?? "" })}
            options={triggerModalFields.map((f, idx) => ({ value: String(idx), label: f.name }))}
          />
        ) : (
          <Column gap="4">
            <Input
              id="cond-field-input"
              label={t("builder.conditions.fieldIndex")}
              value={condition.field ?? ""}
              onChange={(e) => onChange({ field: e.target.value })}
            />
            <Text variant="body-default-xs" onBackground="neutral-weak">
              {t("builder.conditions.fieldIndexHint")}
            </Text>
          </Column>
        ))}
      <LabelSelect
        id="cond-operator"
        label={t("builder.conditions.operator")}
        selectedValue={condition.operator}
        setSelectedValue={(v) => onChange({ operator: v as string as ScenarioConditionOperator })}
        options={CONDITION_OPERATORS.map((o) => ({
          value: o,
          label: t(CONDITION_OPERATOR_LABEL[o]),
        }))}
      />
      <Input
        id={`cond-value-${condition.type}`}
        label={t("builder.conditions.value")}
        value={condition.value}
        onChange={(e) => onChange({ value: e.target.value })}
      />
    </Column>
  );
}
