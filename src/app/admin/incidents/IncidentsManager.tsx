"use client";

import React, { useState } from "react";
import {
  Accordion,
  Button,
  Column,
  Flex,
  Input,
  Line,
  Row,
  SegmentedControl,
  Tag,
  Text,
  Textarea,
  useToast,
} from "@once-ui-system/core";
import { useRouter } from "next/navigation";
import type { Incident, IncidentUpdate } from "@prisma/client";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import { addIncidentUpdate, createIncident, deleteIncident } from "../actions";

const SEVERITY_KEYS = {
  minor: "admin.severity.minor",
  major: "admin.severity.major",
  critical: "admin.severity.critical",
  maintenance: "admin.severity.maintenance",
} as const satisfies Record<string, MessageKey>;

const COMPONENT_KEYS = {
  gateway: "admin.components.gateway",
  database: "admin.components.database",
  website: "admin.components.website",
  shards: "admin.components.shards",
} as const satisfies Record<string, MessageKey>;

const STATUS_KEYS = {
  investigating: "admin.incidents.status.investigating",
  identified: "admin.incidents.status.identified",
  monitoring: "admin.incidents.status.monitoring",
  resolved: "admin.incidents.status.resolved",
} as const satisfies Record<string, MessageKey>;

/** Translated label for a stored enum value; unknown values are shown as they are. */
function useEnumLabel() {
  const t = useT();
  return (keys: Record<string, MessageKey>, value: string) =>
    value in keys ? t(keys[value]) : value;
}

export function IncidentsManager({
  incidents,
}: {
  incidents: (Incident & { updates: IncidentUpdate[] })[];
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const t = useT();

  const severities = Object.entries(SEVERITY_KEYS).map(([value, key]) => ({
    value,
    label: t(key),
  }));
  const components = [
    { value: "", label: t("admin.incidents.noComponent") },
    ...Object.entries(COMPONENT_KEYS).map(([value, key]) => ({ value, label: t(key) })),
  ];

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState("minor");
  const [component, setComponent] = useState("");
  const [pending, setPending] = useState(false);

  const create = async () => {
    setPending(true);

    const fd = new FormData();
    fd.set("title", title);
    fd.set("body", body);
    fd.set("severity", severity);
    fd.set("component", component);

    const result = await createIncident(fd);
    setPending(false);

    if (result.ok) {
      addToast({ message: t("admin.incidents.toast.created"), variant: "success" });
      setTitle("");
      setBody("");
      router.refresh();
    } else {
      addToast({ message: result.error, variant: "danger" });
    }
  };

  const remove = async (id: string) => {
    const result = await deleteIncident(id);

    if (result.ok) {
      addToast({ message: t("admin.incidents.toast.deleted"), variant: "success" });
      router.refresh();
    } else {
      addToast({ message: result.error, variant: "danger" });
    }
  };

  return (
    <Column fillWidth gap="24">
      <Flex
        direction="column"
        fillWidth
        gap="16"
        padding="24"
        radius="l"
        border="neutral-medium"
        background="surface"
      >
        <Text variant="heading-strong-s">{t("admin.incidents.report")}</Text>
        <Line />

        <Input
          id="incident-title"
          label={t("admin.incidents.fields.title")}
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
        />

        <Textarea
          id="incident-body"
          label={t("admin.incidents.fields.body")}
          lines={3}
          value={body}
          maxLength={2000}
          onChange={(e) => setBody(e.target.value)}
        />

        <Column gap="8">
          <Text variant="label-default-s">{t("admin.incidents.fields.severity")}</Text>
          <SegmentedControl
            fillWidth
            buttons={severities}
            value={severity}
            onChange={(value) => setSeverity(value)}
          />
        </Column>

        <Column gap="8">
          <Text variant="label-default-s">{t("admin.incidents.fields.component")}</Text>
          <SegmentedControl
            fillWidth
            buttons={components}
            value={component}
            onChange={(value) => setComponent(value)}
          />
        </Column>

        <Row fillWidth horizontal="end">
          <Button onClick={create} loading={pending} disabled={pending || title.length < 3}>
            {t("admin.incidents.create")}
          </Button>
        </Row>
      </Flex>

      <Column fillWidth gap="12">
        <Text variant="heading-strong-s">{t("admin.incidents.history", { count: incidents.length })}</Text>

        {incidents.length === 0 && (
          <Text variant="body-default-s" onBackground="neutral-weak">
            {t("admin.incidents.empty")}
          </Text>
        )}

        {incidents.map((incident) => (
          <Accordion key={incident.id} title={incident.title}>
            <IncidentCard incident={incident} onDelete={() => remove(incident.id)} />
          </Accordion>
        ))}
      </Column>
    </Column>
  );
}

function IncidentCard({
  incident,
  onDelete,
}: {
  incident: Incident & { updates: IncidentUpdate[] };
  onDelete: () => void;
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const t = useT();
  const enumLabel = useEnumLabel();

  const statuses = Object.entries(STATUS_KEYS).map(([value, key]) => ({ value, label: t(key) }));

  const [status, setStatus] = useState(incident.status);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);

  const submit = async () => {
    setPending(true);

    const fd = new FormData();
    fd.set("incidentId", incident.id);
    fd.set("status", status);
    fd.set("body", body);

    const result = await addIncidentUpdate(fd);
    setPending(false);

    if (result.ok) {
      addToast({ message: t("admin.incidents.toast.updatePosted"), variant: "success" });
      setBody("");
      router.refresh();
    } else {
      addToast({ message: result.error, variant: "danger" });
    }
  };

  return (
    <Column fillWidth gap="12">
      <Row gap="8" vertical="center" wrap>
        <Tag scheme={incident.resolvedAt ? "success" : "warning"}>
          {incident.resolvedAt
            ? t("admin.incidents.resolved")
            : enumLabel(STATUS_KEYS, incident.status)}
        </Tag>
        <Tag scheme="neutral">{enumLabel(SEVERITY_KEYS, incident.severity)}</Tag>
        {incident.component && <Tag scheme="neutral">{enumLabel(COMPONENT_KEYS, incident.component)}</Tag>}
        {incident.auto && <Tag scheme="info">{t("admin.incidents.automatic")}</Tag>}
      </Row>

      {incident.updates.map((update) => (
        <Column key={update.id} gap="2">
          <Text variant="label-default-s">{enumLabel(STATUS_KEYS, update.status)}</Text>
          <Text variant="body-default-s" onBackground="neutral-medium">
            {update.body}
          </Text>
        </Column>
      ))}

      <Line />

      <SegmentedControl
        fillWidth
        buttons={statuses}
        value={status}
        onChange={(value) => setStatus(value)}
      />

      <Textarea
        id={`incident-update-${incident.id}`}
        label={t("admin.incidents.fields.update")}
        lines={2}
        value={body}
        maxLength={2000}
        onChange={(e) => setBody(e.target.value)}
      />

      <Row gap="8" horizontal="end">
        <Button size="s" variant="danger" onClick={onDelete}>
          {t("common.actions.delete")}
        </Button>
        <Button size="s" onClick={submit} loading={pending} disabled={pending || !body.trim()}>
          {t("admin.incidents.postUpdate")}
        </Button>
      </Row>
    </Column>
  );
}
