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
import { addIncidentUpdate, createIncident, deleteIncident } from "../actions";

const SEVERITIES = [
  { value: "minor", label: "Minor" },
  { value: "major", label: "Major" },
  { value: "critical", label: "Critical" },
  { value: "maintenance", label: "Maintenance" },
];

const COMPONENTS = [
  { value: "", label: "None" },
  { value: "gateway", label: "Gateway" },
  { value: "database", label: "Database" },
  { value: "website", label: "Website" },
  { value: "shards", label: "Shards" },
];

const STATUSES = [
  { value: "investigating", label: "Investigating" },
  { value: "identified", label: "Identified" },
  { value: "monitoring", label: "Monitoring" },
  { value: "resolved", label: "Resolved" },
];

export function IncidentsManager({
  incidents,
}: {
  incidents: (Incident & { updates: IncidentUpdate[] })[];
}) {
  const router = useRouter();
  const { addToast } = useToast();

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
      addToast({ message: "Incident created", variant: "success" });
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
      addToast({ message: "Incident deleted", variant: "success" });
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
        <Text variant="heading-strong-s">Report an incident</Text>
        <Line />

        <Input
          id="incident-title"
          label="Title"
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
        />

        <Textarea
          id="incident-body"
          label="What is going on"
          lines={3}
          value={body}
          maxLength={2000}
          onChange={(e) => setBody(e.target.value)}
        />

        <Column gap="8">
          <Text variant="label-default-s">Severity</Text>
          <SegmentedControl
            fillWidth
            buttons={SEVERITIES}
            selected={severity}
            onToggle={(value) => setSeverity(value)}
          />
        </Column>

        <Column gap="8">
          <Text variant="label-default-s">Affected component</Text>
          <SegmentedControl
            fillWidth
            buttons={COMPONENTS}
            selected={component}
            onToggle={(value) => setComponent(value)}
          />
        </Column>

        <Row fillWidth horizontal="end">
          <Button onClick={create} loading={pending} disabled={pending || title.length < 3}>
            Create incident
          </Button>
        </Row>
      </Flex>

      <Column fillWidth gap="12">
        <Text variant="heading-strong-s">History ({incidents.length})</Text>

        {incidents.length === 0 && (
          <Text variant="body-default-s" onBackground="neutral-weak">
            No incidents recorded.
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
      addToast({ message: "Update posted", variant: "success" });
      setBody("");
      router.refresh();
    } else {
      addToast({ message: result.error, variant: "danger" });
    }
  };

  return (
    <Column fillWidth gap="12">
      <Row gap="8" vertical="center" wrap>
        <Tag variant={incident.resolvedAt ? "success" : "warning"}>
          {incident.resolvedAt ? "resolved" : incident.status}
        </Tag>
        <Tag variant="neutral">{incident.severity}</Tag>
        {incident.component && <Tag variant="neutral">{incident.component}</Tag>}
        {incident.auto && <Tag variant="info">automatic</Tag>}
      </Row>

      {incident.updates.map((update) => (
        <Column key={update.id} gap="2">
          <Text variant="label-default-s">{update.status}</Text>
          <Text variant="body-default-s" onBackground="neutral-medium">
            {update.body}
          </Text>
        </Column>
      ))}

      <Line />

      <SegmentedControl
        fillWidth
        buttons={STATUSES}
        selected={status}
        onToggle={(value) => setStatus(value)}
      />

      <Textarea
        id={`incident-update-${incident.id}`}
        label="Update"
        lines={2}
        value={body}
        maxLength={2000}
        onChange={(e) => setBody(e.target.value)}
      />

      <Row gap="8" horizontal="end">
        <Button size="s" variant="danger" onClick={onDelete}>
          Delete
        </Button>
        <Button size="s" onClick={submit} loading={pending} disabled={pending || !body.trim()}>
          Post update
        </Button>
      </Row>
    </Column>
  );
}
