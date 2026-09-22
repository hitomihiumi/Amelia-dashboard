"use client";

import React, { useState } from "react";
import {
  Button,
  Column,
  Flex,
  Input,
  Line,
  Row,
  SegmentedControl,
  Switch,
  Text,
  Textarea,
  useToast,
} from "@once-ui-system/core";
import { useRouter } from "next/navigation";
import type { GlobalConfig } from "@prisma/client";
import type { ServiceOverride } from "@/lib/admin/config";
import { updateGlobalConfig } from "../actions";

const BANNER_VARIANTS = [
  { value: "info", label: "Info" },
  { value: "warning", label: "Warning" },
  { value: "danger", label: "Danger" },
  { value: "success", label: "Success" },
];

const SERVICE_STATUSES = [
  { value: "", label: "Measured" },
  { value: "operational", label: "Operational" },
  { value: "degraded", label: "Degraded" },
  { value: "down", label: "Down" },
  { value: "maintenance", label: "Maintenance" },
];

const SERVICES = [
  { key: "gateway", label: "Discord Gateway" },
  { key: "database", label: "Database" },
  { key: "website", label: "Website" },
  { key: "shards", label: "Shards" },
];

interface FormState {
  bannerEnabled: boolean;
  bannerText: string;
  bannerVariant: string;
  inviteUrl: string;
  supportUrl: string;
  githubUrl: string;
  heroTagline: string;
  heroText: string;
  maintenance: boolean;
  maintenanceMessage: string;
  serviceOverrides: Record<string, ServiceOverride>;
}

export function GlobalConfigForm({
  config,
  overrides,
}: {
  config: GlobalConfig;
  overrides: Record<string, ServiceOverride>;
}) {
  const router = useRouter();
  const { addToast } = useToast();

  const [state, setState] = useState<FormState>({
    bannerEnabled: config.bannerEnabled,
    bannerText: config.bannerText ?? "",
    bannerVariant: config.bannerVariant,
    inviteUrl: config.inviteUrl ?? "",
    supportUrl: config.supportUrl ?? "",
    githubUrl: config.githubUrl ?? "",
    heroTagline: config.heroTagline ?? "",
    heroText: config.heroText ?? "",
    maintenance: config.maintenance,
    maintenanceMessage: config.maintenanceMessage ?? "",
    serviceOverrides: overrides,
  });
  const [pending, setPending] = useState(false);

  const update = (patch: Partial<FormState>) => setState((prev) => ({ ...prev, ...patch }));

  const setOverride = (key: string, patch: ServiceOverride) =>
    setState((prev) => {
      const next = { ...prev.serviceOverrides };
      const merged = { ...(next[key] ?? {}), ...patch };

      // An empty status means "trust the measurement" — drop the entry entirely.
      if (!merged.status) delete next[key];
      else next[key] = merged;

      return { ...prev, serviceOverrides: next };
    });

  const save = async () => {
    setPending(true);

    const fd = new FormData();
    fd.set("config", JSON.stringify(state));

    const result = await updateGlobalConfig(fd);
    setPending(false);

    if (result.ok) {
      addToast({ message: "Configuration saved", variant: "success" });
      router.refresh();
    } else {
      addToast({ message: result.error, variant: "danger" });
    }
  };

  return (
    <Column fillWidth gap="24">
      <Section title="Site banner" description="Shown above the header on every public page.">
        <Row fillWidth gap="12" vertical="center">
          <Switch
            isChecked={state.bannerEnabled}
            onToggle={() => update({ bannerEnabled: !state.bannerEnabled })}
          />
          <Text variant="label-default-s">Show the banner</Text>
        </Row>

        <Textarea
          id="banner-text"
          label="Banner text"
          lines={2}
          value={state.bannerText}
          maxLength={300}
          onChange={(e) => update({ bannerText: e.target.value })}
        />

        <SegmentedControl
          fillWidth
          buttons={BANNER_VARIANTS}
          selected={state.bannerVariant}
          onToggle={(value) => update({ bannerVariant: value })}
        />
      </Section>

      <Section title="Links" description="Used by the landing page buttons and the footer.">
        <Input
          id="invite-url"
          label="Bot invite URL"
          value={state.inviteUrl}
          maxLength={500}
          onChange={(e) => update({ inviteUrl: e.target.value })}
        />
        <Input
          id="support-url"
          label="Support server URL"
          value={state.supportUrl}
          maxLength={500}
          onChange={(e) => update({ supportUrl: e.target.value })}
        />
        <Input
          id="github-url"
          label="GitHub URL"
          value={state.githubUrl}
          maxLength={500}
          onChange={(e) => update({ githubUrl: e.target.value })}
        />
      </Section>

      <Section title="Landing copy" description="Leave empty to keep the built-in wording.">
        <Input
          id="hero-tagline"
          label="Tagline"
          value={state.heroTagline}
          maxLength={120}
          onChange={(e) => update({ heroTagline: e.target.value })}
        />
        <Textarea
          id="hero-text"
          label="Hero text"
          lines={2}
          value={state.heroText}
          maxLength={400}
          onChange={(e) => update({ heroText: e.target.value })}
        />
      </Section>

      <Section
        title="Status page"
        description="Maintenance mode overrides every service; individual overrides win over the measurement."
      >
        <Row fillWidth gap="12" vertical="center">
          <Switch
            isChecked={state.maintenance}
            onToggle={() => update({ maintenance: !state.maintenance })}
          />
          <Text variant="label-default-s">Maintenance mode</Text>
        </Row>

        <Input
          id="maintenance-message"
          label="Maintenance message"
          value={state.maintenanceMessage}
          maxLength={300}
          onChange={(e) => update({ maintenanceMessage: e.target.value })}
        />

        <Line />

        {SERVICES.map((service) => (
          <Column key={service.key} fillWidth gap="8">
            <Text variant="label-default-s">{service.label}</Text>
            <SegmentedControl
              fillWidth
              buttons={SERVICE_STATUSES}
              selected={state.serviceOverrides[service.key]?.status ?? ""}
              onToggle={(value) => setOverride(service.key, { status: value })}
            />
            {state.serviceOverrides[service.key]?.status && (
              <Input
                id={`override-note-${service.key}`}
                label="Note"
                value={state.serviceOverrides[service.key]?.note ?? ""}
                maxLength={200}
                onChange={(e) => setOverride(service.key, { note: e.target.value })}
              />
            )}
          </Column>
        ))}
      </Section>

      <Row fillWidth horizontal="end">
        <Button onClick={save} loading={pending} disabled={pending}>
          Save configuration
        </Button>
      </Row>
    </Column>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Flex
      direction="column"
      fillWidth
      gap="16"
      padding="24"
      radius="l"
      border="neutral-medium"
      background="surface"
    >
      <Column gap="4">
        <Text variant="heading-strong-s">{title}</Text>
        <Text variant="body-default-s" onBackground="neutral-weak">
          {description}
        </Text>
      </Column>
      <Line />
      {children}
    </Flex>
  );
}
