"use client";

import { MediaUrlField } from "@/app/dashboard/[guildId]/components/layouts/MediaUrlField";
import { BannerCanvas } from "@/components/banners/BannerCanvas";
import { ColorInput } from "@/components/dashboard/ColorInput";
import { ConfirmIconButton } from "@/components/dashboard/ConfirmIconButton";
import { LabelSelect } from "@/components/dashboard/discord/LabelSelect";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import { defaultLayer, type BannerLayerType } from "@/lib/banners/templates";
import { generateID } from "@/lib/db/generateID";
import {
  BANNER_LIMITS,
  type BannerBackground,
  type BannerLayer,
  type BannerStats,
  type ServerBanner,
} from "@/lib/db/types";
import type { IconName } from "@/resources/icons";
import {
  Button,
  Column,
  DropdownWrapper,
  Grid,
  Icon,
  IconButton,
  Input,
  Option,
  Row,
  SegmentedControl,
  Slider,
  Text,
} from "@once-ui-system/core";
import { useMemo, useState } from "react";
import { LayerForm } from "./LayerForm";

const LAYER_TYPES: BannerLayerType[] = ["text", "shape", "image", "avatar", "progress"];
const LAYER_ICON: Record<BannerLayerType, IconName> = {
  text: "text",
  shape: "square",
  image: "image",
  avatar: "avatar",
  progress: "progress",
};

/** `Row as="button"` does not type `type`, but the element still needs it (never a submit button). */
const NATIVE_BUTTON = { type: "button" } as const;

const TIMEZONES = [
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Kyiv",
  "Europe/Moscow",
  "Europe/Istanbul",
  "Asia/Dubai",
  "Asia/Almaty",
  "Asia/Kolkata",
  "Asia/Bangkok",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "America/Sao_Paulo",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
];

const BACKGROUND_DEFAULTS: Record<BannerBackground["type"], BannerBackground> = {
  color: { type: "color", color: "#1b1f3b" },
  gradient: { type: "gradient", from: "#1b1f3b", to: "#7c3aed", angle: 135 },
  image: { type: "image", src: "", dim: 40, blur: 0, color: "#000000" },
};

function BackgroundForm({
  background,
  onChange,
}: {
  background: BannerBackground;
  onChange: (next: BannerBackground) => void;
}) {
  const t = useT();

  return (
    <Column fillWidth gap="12">
      <SegmentedControl
        fillWidth
        value={background.type}
        onChange={(type) => {
          if (type === background.type) return;
          const next = BACKGROUND_DEFAULTS[type as BannerBackground["type"]];
          // The colour the author picked carries over to the new kind.
          const carried =
            background.type === "color"
              ? background.color
              : background.type === "gradient"
                ? background.from
                : background.color;
          onChange(
            next.type === "color"
              ? { ...next, color: carried }
              : next.type === "gradient"
                ? { ...next, from: carried }
                : { ...next, color: carried },
          );
        }}
        buttons={[
          { label: t("banners.background.color"), value: "color" },
          { label: t("banners.background.gradient"), value: "gradient" },
          { label: t("banners.background.image"), value: "image" },
        ]}
      />

      {background.type === "color" ? (
        <ColorInput
          id="banner-bg-color"
          label={t("banners.layer.color")}
          value={background.color}
          onChange={(e) => onChange({ ...background, color: e.target.value })}
        />
      ) : null}

      {background.type === "gradient" ? (
        <>
          <ColorInput
            id="banner-bg-from"
            label={t("banners.background.from")}
            value={background.from}
            onChange={(e) => onChange({ ...background, from: e.target.value })}
          />
          <ColorInput
            id="banner-bg-to"
            label={t("banners.background.to")}
            value={background.to}
            onChange={(e) => onChange({ ...background, to: e.target.value })}
          />
          <Slider
            id="banner-bg-angle"
            label={t("banners.background.angle")}
            min={0}
            max={360}
            step={5}
            showValue
            value={background.angle}
            onChange={(angle) => onChange({ ...background, angle: Math.round(angle) })}
          />
        </>
      ) : null}

      {background.type === "image" ? (
        <>
          <MediaUrlField
            id="banner-bg-src"
            label={t("banners.layer.image.link")}
            value={background.src}
            placeholderSet="banner"
            onChange={(src) => onChange({ ...background, src })}
          />
          <Text variant="body-default-xs" onBackground="neutral-weak" paddingX="4">
            {t("banners.background.imageHint")}
          </Text>
          <ColorInput
            id="banner-bg-dim-color"
            label={t("banners.background.dimColor")}
            value={background.color}
            onChange={(e) => onChange({ ...background, color: e.target.value })}
          />
          <Slider
            id="banner-bg-dim"
            label={t("banners.background.dim")}
            min={0}
            max={100}
            step={1}
            showValue
            value={background.dim}
            onChange={(dim) => onChange({ ...background, dim: Math.round(dim) })}
          />
          <Slider
            id="banner-bg-blur"
            label={t("banners.background.blur")}
            min={0}
            max={40}
            step={1}
            showValue
            value={background.blur}
            onChange={(blur) => onChange({ ...background, blur: Math.round(blur) })}
          />
        </>
      ) : null}
    </Column>
  );
}

export interface BannerEditorProps {
  banner: ServerBanner;
  stats: BannerStats;
  onChange: (next: ServerBanner) => void;
}

/**
 * Edits one banner: its canvas (click, drag and resize the elements right on it), the list of
 * elements with their order and visibility, and the properties of what is selected.
 */
export function BannerEditor({ banner, stats, onChange }: BannerEditorProps) {
  const t = useT();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const selected = banner.layers.find((layer) => layer.id === selectedId) ?? null;
  const update = (patch: Partial<ServerBanner>) => onChange({ ...banner, ...patch });

  const updateLayer = (id: string, patch: Record<string, unknown>) =>
    update({
      layers: banner.layers.map((layer) =>
        layer.id === id ? ({ ...layer, ...patch } as BannerLayer) : layer,
      ),
    });

  const layerName = (layer: BannerLayer) =>
    layer.name.trim() ||
    (layer.type === "text" && layer.text.trim()) ||
    t(`banners.layer.types.${layer.type}` as MessageKey);

  const addLayer = (type: BannerLayerType) => {
    setAddOpen(false);
    if (banner.layers.length >= BANNER_LIMITS.layers) return;
    const layer = defaultLayer(
      type,
      t(`banners.layer.types.${type}` as MessageKey),
      t("banners.layer.defaultText"),
    );
    update({ layers: [...banner.layers, layer] });
    setSelectedId(layer.id);
  };

  const duplicate = (layer: BannerLayer) => {
    if (banner.layers.length >= BANNER_LIMITS.layers) return;
    const copy = { ...layer, id: generateID(), x: layer.x + 20, y: layer.y + 20 } as BannerLayer;
    const index = banner.layers.findIndex((item) => item.id === layer.id);
    update({
      layers: [...banner.layers.slice(0, index + 1), copy, ...banner.layers.slice(index + 1)],
    });
    setSelectedId(copy.id);
  };

  const remove = (id: string) => {
    update({ layers: banner.layers.filter((layer) => layer.id !== id) });
    if (selectedId === id) setSelectedId(null);
  };

  /** `direction` 1 brings the layer to the front by one step, -1 sends it back. */
  const reorder = (id: string, direction: number) => {
    const index = banner.layers.findIndex((layer) => layer.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= banner.layers.length) return;
    const next = [...banner.layers];
    [next[index], next[target]] = [next[target], next[index]];
    update({ layers: next });
  };

  const timezoneOptions = useMemo(() => {
    const zones = TIMEZONES.includes(banner.timezone) ? TIMEZONES : [banner.timezone, ...TIMEZONES];
    return zones.map((zone) => ({ label: zone, value: zone }));
  }, [banner.timezone]);

  // The list reads like a stack of layers in a design tool: the front one is on top.
  const stack = [...banner.layers].reverse();

  return (
    <Column fillWidth gap="16">
      <Row fillWidth gap="12" wrap vertical="start">
        <Column flex="2" minWidth={16} style={{ flexBasis: 240 }}>
          <Input
            id="banner-name"
            label={t("banners.editor.name")}
            value={banner.name}
            maxLength={BANNER_LIMITS.name}
            onChange={(e) => update({ name: e.target.value })}
          />
        </Column>
        <Column flex="1" minWidth={16} style={{ flexBasis: 200 }}>
          <LabelSelect
            id="banner-timezone"
            label={t("banners.editor.timezone")}
            options={timezoneOptions}
            selectedValue={banner.timezone}
            setSelectedValue={(timezone) => update({ timezone: String(timezone) })}
            searchable
          />
        </Column>
      </Row>

      <BannerCanvas
        banner={banner}
        stats={stats}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onChangeLayer={(id, patch) => updateLayer(id, patch)}
      />
      <Text variant="body-default-xs" onBackground="neutral-weak">
        {t("banners.editor.canvasHint")}
      </Text>

      <Grid
        fillWidth
        gap="16"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
          alignItems: "start",
        }}
      >
        <Column fillWidth gap="8">
          <Row fillWidth horizontal="between" vertical="center" gap="8" wrap>
            <Text variant="label-strong-m">
              {t("banners.editor.elements", {
                count: banner.layers.length,
                max: BANNER_LIMITS.layers,
              })}
            </Text>
            <DropdownWrapper
              open={addOpen}
              onOpenChange={setAddOpen}
              placement="bottom-end"
              trigger={
                <Button prefixIcon="plus" disabled={banner.layers.length >= BANNER_LIMITS.layers}>
                  {t("banners.editor.add")}
                </Button>
              }
              dropdown={
                <Column gap="2" padding="4" minWidth={14}>
                  {LAYER_TYPES.map((type) => (
                    <Option
                      key={type}
                      value={type}
                      label={t(`banners.layer.types.${type}` as MessageKey)}
                      prefix={<Icon name={LAYER_ICON[type]} size="xs" />}
                      onClick={() => addLayer(type)}
                    />
                  ))}
                </Column>
              }
            />
          </Row>

          <Column fillWidth gap="4">
            {stack.map((layer) => {
              const isSelected = layer.id === selectedId;
              const index = banner.layers.findIndex((item) => item.id === layer.id);
              return (
                <Row
                  key={layer.id}
                  fillWidth
                  vertical="center"
                  gap="4"
                  paddingX="8"
                  paddingY="4"
                  radius="m"
                  border={isSelected ? "brand-strong" : "neutral-weak"}
                  background={isSelected ? "surface" : "neutral-alpha-weak"}
                >
                  <Row
                    as="button"
                    {...NATIVE_BUTTON}
                    flex="1"
                    minWidth={0}
                    vertical="center"
                    gap="8"
                    paddingY="4"
                    style={{
                      background: "transparent",
                      border: 0,
                      color: "inherit",
                      font: "inherit",
                      textAlign: "left",
                      cursor: "pointer",
                      opacity: layer.visible ? 1 : 0.5,
                    }}
                    onClick={() => setSelectedId(layer.id)}
                  >
                    <Icon name={LAYER_ICON[layer.type]} size="xs" onBackground="neutral-weak" />
                    <Text variant="body-default-s" style={{ overflowWrap: "anywhere" }}>
                      {layerName(layer)}
                    </Text>
                  </Row>
                  <IconButton
                    icon={layer.visible ? "eye" : "eyeoff"}
                    variant="ghost"
                    size="s"
                    tooltip={layer.visible ? t("banners.editor.hide") : t("banners.editor.show")}
                    onClick={() => updateLayer(layer.id, { visible: !layer.visible })}
                  />
                  {isSelected ? (
                    <>
                      <IconButton
                        icon="chevronUp"
                        variant="ghost"
                        size="s"
                        tooltip={t("banners.editor.forward")}
                        disabled={index === banner.layers.length - 1}
                        onClick={() => reorder(layer.id, 1)}
                      />
                      <IconButton
                        icon="chevronDown"
                        variant="ghost"
                        size="s"
                        tooltip={t("banners.editor.backward")}
                        disabled={index === 0}
                        onClick={() => reorder(layer.id, -1)}
                      />
                      <IconButton
                        icon="copy"
                        variant="ghost"
                        size="s"
                        tooltip={t("builder.shared.duplicate")}
                        disabled={banner.layers.length >= BANNER_LIMITS.layers}
                        onClick={() => duplicate(layer)}
                      />
                      <ConfirmIconButton
                        variant="immediate"
                        tooltip={t("banners.editor.delete")}
                        onConfirm={() => remove(layer.id)}
                      />
                    </>
                  ) : null}
                </Row>
              );
            })}

            <Row
              as="button"
              {...NATIVE_BUTTON}
              fillWidth
              vertical="center"
              gap="8"
              paddingX="12"
              paddingY="8"
              radius="m"
              border={selected === null ? "brand-strong" : "neutral-weak"}
              background={selected === null ? "surface" : "neutral-alpha-weak"}
              style={{ color: "inherit", font: "inherit", textAlign: "left", cursor: "pointer" }}
              onClick={() => setSelectedId(null)}
            >
              <Icon name="image" size="xs" onBackground="neutral-weak" />
              <Text variant="body-default-s">{t("banners.editor.background")}</Text>
            </Row>
          </Column>
        </Column>

        <Column
          fillWidth
          gap="12"
          padding="16"
          radius="m"
          border="neutral-medium"
          background="surface"
        >
          <Text variant="label-strong-m">
            {selected ? layerName(selected) : t("banners.editor.background")}
          </Text>
          {selected ? (
            <LayerForm
              key={selected.id}
              layer={selected}
              onChange={(patch) => updateLayer(selected.id, patch)}
            />
          ) : (
            <BackgroundForm
              background={banner.background}
              onChange={(background) => update({ background })}
            />
          )}
        </Column>
      </Grid>
    </Column>
  );
}
