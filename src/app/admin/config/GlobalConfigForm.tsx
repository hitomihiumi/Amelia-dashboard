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
import { useT } from "@/i18n/client";
import { updateGlobalConfig } from "../actions";

const SERVICE_KEYS = ["gateway", "database", "website", "shards"] as const;

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
  const t = useT();

  const bannerVariants = [
    { value: "info", label: t("admin.config.banner.variant.info") },
    { value: "warning", label: t("admin.config.banner.variant.warning") },
    { value: "danger", label: t("admin.config.banner.variant.danger") },
    { value: "success", label: t("admin.config.banner.variant.success") },
  ];

  const serviceStatuses = [
    { value: "", label: t("admin.serviceStatus.measured") },
    { value: "operational", label: t("admin.serviceStatus.operational") },
    { value: "degraded", label: t("admin.serviceStatus.degraded") },
    { value: "down", label: t("admin.serviceStatus.down") },
    { value: "maintenance", label: t("admin.serviceStatus.maintenance") },
  ];

  const services = SERVICE_KEYS.map((key) => ({ key, label: t(`admin.components.${key}`) }));

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
      addToast({ message: t("admin.config.saved"), variant: "success" });
      router.refresh();
    } else {
      addToast({ message: result.error, variant: "danger" });
    }
  };

  return (
    <Column fillWidth gap="24">
      <Section title={t("admin.config.banner.title")}
        description={t("admin.config.banner.description")}>
        <Row fillWidth gap="12" vertical="center">
          <Switch
            checked={state.bannerEnabled}
            onToggle={() => update({ bannerEnabled: !state.bannerEnabled })}
          />
          <Text variant="label-default-s">{t("admin.config.banner.show")}</Text>
        </Row>

        <Textarea
          id="banner-text"
          label={t("admin.config.banner.text")}
          lines={2}
          value={state.bannerText}
          maxLength={300}
          onChange={(e) => update({ bannerText: e.target.value })}
        />

        <SegmentedControl
          fillWidth
          buttons={bannerVariants}
          value={state.bannerVariant}
          onChange={(value) => update({ bannerVariant: value })}
        />
      </Section>

      <Section title={t("admin.config.links.title")}
        description={t("admin.config.links.description")}>
        <Input
          id="invite-url"
          label={t("admin.config.links.invite")}
          value={state.inviteUrl}
          maxLength={500}
          onChange={(e) => update({ inviteUrl: e.target.value })}
        />
        <Input
          id="support-url"
          label={t("admin.config.links.support")}
          value={state.supportUrl}
          maxLength={500}
          onChange={(e) => update({ supportUrl: e.target.value })}
        />
        <Input
          id="github-url"
          label={t("admin.config.links.github")}
          value={state.githubUrl}
          maxLength={500}
          onChange={(e) => update({ githubUrl: e.target.value })}
        />
      </Section>

      <Section title={t("admin.config.landing.title")}
        description={t("admin.config.landing.description")}>
        <Input
          id="hero-tagline"
          label={t("admin.config.landing.tagline")}
          value={state.heroTagline}
          maxLength={120}
          onChange={(e) => update({ heroTagline: e.target.value })}
        />
        <Textarea
          id="hero-text"
          label={t("admin.config.landing.heroText")}
          lines={2}
          value={state.heroText}
          maxLength={400}
          onChange={(e) => update({ heroText: e.target.value })}
        />
      </Section>

      <Section
        title={t("admin.config.status.title")}
        description={t("admin.config.status.description")}
      >
        <Row fillWidth gap="12" vertical="center">
          <Switch
            checked={state.maintenance}
            onToggle={() => update({ maintenance: !state.maintenance })}
          />
          <Text variant="label-default-s">{t("admin.config.status.maintenance")}</Text>
        </Row>

        <Input
          id="maintenance-message"
          label={t("admin.config.status.maintenanceMessage")}
          value={state.maintenanceMessage}
          maxLength={300}
          onChange={(e) => update({ maintenanceMessage: e.target.value })}
        />

        <Line />

        {services.map((service) => (
          <Column key={service.key} fillWidth gap="8">
            <Text variant="label-default-s">{service.label}</Text>
            <SegmentedControl
              fillWidth
              buttons={serviceStatuses}
              value={state.serviceOverrides[service.key]?.status ?? ""}
              onChange={(value) => setOverride(service.key, { status: value })}
            />
            {state.serviceOverrides[service.key]?.status && (
              <Input
                id={`override-note-${service.key}`}
                label={t("admin.config.status.note")}
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
          {t("admin.config.save")}
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
