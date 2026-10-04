"use client";

import React from "react";
import classNames from "classnames";
import { Button, Column, Text, Textarea } from "@once-ui-system/core";
import { IoInformationCircleOutline } from "react-icons/io5";
import { AdminCard } from "@/components/admin/AdminPage";
import { useT } from "@/i18n/client";
import type { IncidentStatus } from "@/components/status/incidentMeta";
import tones from "@/components/status/tones.module.scss";
import { applyTemplate, CharCounter, StatusPicker, TemplateChips } from "./incidentUi";
import { BODY_MAX } from "./types";
import styles from "./IncidentDetail.module.scss";

export const MESSAGE_FIELD_ID = "incident-update-message";

interface UpdateComposerProps {
  status: IncidentStatus;
  body: string;
  onStatusChange: (status: IncidentStatus) => void;
  onBodyChange: (body: string) => void;
  onPost: () => void;
  onResolve: () => void;
  onReopen: () => void;
  pending: boolean;
  resolved: boolean;
  /** Pre-formatted "2 hours ago" for the resolved notice. */
  resolvedAgo: string | null;
  auto: boolean;
}

export function UpdateComposer({
  status,
  body,
  onStatusChange,
  onBodyChange,
  onPost,
  onResolve,
  onReopen,
  pending,
  resolved,
  resolvedAgo,
  auto,
}: UpdateComposerProps) {
  const t = useT();

  const templates = (["a", "b"] as const).map((variant) => ({
    key: variant,
    label: t(`adminIncidents.templates.update.${status}.${variant}.label`),
    text: t(`adminIncidents.templates.update.${status}.${variant}.text`),
  }));

  const valid = body.trim().length > 0 && body.length <= BODY_MAX;

  return (
    <AdminCard padding="20" gap="16">
      <Text variant="heading-strong-s" as="h2">
        {t("adminIncidents.detail.composer.title")}
      </Text>

      {resolved && (
        <div className={classNames(styles.notice, tones.success)}>
          <span>
            {t("adminIncidents.detail.composer.resolvedNotice", { time: resolvedAgo ?? "" })}
          </span>
          <Button size="s" variant="secondary" prefixIcon="refresh" onClick={onReopen} disabled={pending}>
            {t("adminIncidents.detail.composer.reopen")}
          </Button>
        </div>
      )}

      <Column gap="8">
        <Text variant="label-default-s" onBackground="neutral-weak">
          {t("adminIncidents.detail.composer.status")}
        </Text>
        <StatusPicker
          label={t("adminIncidents.detail.composer.status")}
          value={status}
          onChange={onStatusChange}
        />
      </Column>

      <Column gap="4">
        <Textarea
          id={MESSAGE_FIELD_ID}
          label={t("adminIncidents.detail.composer.message")}
          placeholder={t("adminIncidents.detail.composer.placeholder")}
          lines={5}
          value={body}
          maxLength={BODY_MAX}
          onChange={(event) => onBodyChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && valid && !pending) {
              event.preventDefault();
              onPost();
            }
          }}
        />
        <div className={styles.fieldFoot}>
          <CharCounter count={body.length} max={BODY_MAX} />
        </div>
      </Column>

      <TemplateChips
        label={t("adminIncidents.detail.composer.templates")}
        templates={templates}
        onPick={(key) => {
          const template = templates.find((item) => item.key === key);
          if (template) onBodyChange(applyTemplate(body, template.text, BODY_MAX));
        }}
      />

      <Column gap="8">
        <Button fillWidth onClick={onPost} loading={pending} disabled={!valid || pending}>
          {t("adminIncidents.detail.composer.post")}
        </Button>

        {!resolved && (
          <>
            <Button
              fillWidth
              variant="success"
              prefixIcon="check"
              onClick={onResolve}
              disabled={pending || body.length > BODY_MAX}
            >
              {t("adminIncidents.detail.composer.resolve")}
            </Button>
            <Text variant="body-default-xs" onBackground="neutral-weak" align="center">
              {t("adminIncidents.detail.composer.resolveHint")}
            </Text>
          </>
        )}
      </Column>

      {auto && (
        <div className={styles.noticeInfo}>
          <IoInformationCircleOutline aria-hidden />
          <span>{t("adminIncidents.detail.autoNotice")}</span>
        </div>
      )}
    </AdminCard>
  );
}
