"use client";

import { ImageSourceField } from "@/components/banners/BannerImages";
import { ColorInput } from "@/components/dashboard/ColorInput";
import { LabelSelect } from "@/components/dashboard/discord/LabelSelect";
import { TextTools } from "@/components/dashboard/text/TextTools";
import { useT } from "@/i18n/client";
import type { MessageKey } from "@/i18n/messages";
import {
  BANNER_FONTS,
  BANNER_HEIGHT,
  BANNER_WIDTH,
  type BannerLayer,
  type BannerMetric,
} from "@/lib/db/types";
import { useEffect, useRef, useState } from "react";
import {
  Column,
  Grid,
  IconButton,
  Input,
  NumberInput,
  Row,
  SegmentedControl,
  Slider,
  Switch,
  Text,
} from "@once-ui-system/core";

const METRICS: Array<{ value: BannerMetric; label: MessageKey }> = [
  { value: "members", label: "banners.metric.members" },
  { value: "members_online", label: "banners.metric.members_online" },
  { value: "voice_members", label: "banners.metric.voice_members" },
  { value: "boosts", label: "banners.metric.boosts" },
  { value: "messages_today", label: "banners.metric.messages_today" },
];

/** Radius that turns a rectangle into a pill or a circle. */
const FULL_RADIUS = 2000;

export interface LayerFormProps {
  layer: BannerLayer;
  onChange: (patch: Record<string, unknown>) => void;
}

/** One row of fields; they share the width while each keeps a readable size. */
function Fields({ children }: { children: React.ReactNode }) {
  return (
    <Grid
      fillWidth
      gap="12"
      style={{
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 120px), 1fr))",
        alignItems: "start",
      }}
    >
      {children}
    </Grid>
  );
}

/**
 * A number field that follows the value when it changes from outside (dragging an element on the
 * canvas moves X and Y). The Once UI `NumberInput` keeps the text it was created with, so it is
 * created again whenever the value differs from the one it reported itself.
 */
function Num({
  id,
  label,
  value,
  min,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const reported = useRef(Math.round(value));
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (Math.round(value) !== reported.current) {
      reported.current = Math.round(value);
      setVersion((current) => current + 1);
    }
  }, [value]);

  return (
    <NumberInput
      key={version}
      id={id}
      label={label}
      value={Math.round(value)}
      min={min}
      max={max}
      step={1}
      onChange={(next) => {
        const typed = Number(next) || 0;
        const accepted = Math.round(clamp(typed, min, max));
        reported.current = accepted;
        // Out of range: the field is created again, showing the value that was kept.
        if (accepted !== typed) setVersion((current) => current + 1);
        onChange(accepted);
      }}
    />
  );
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** The properties of the selected layer: where it is, how it looks, what it shows. */
export function LayerForm({ layer, onChange }: LayerFormProps) {
  const t = useT();
  const id = (name: string) => `layer-${layer.id}-${name}`;

  return (
    <Column fillWidth gap="16">
      <Input
        id={id("name")}
        label={t("banners.layer.name")}
        value={layer.name}
        maxLength={60}
        onChange={(e) => onChange({ name: e.target.value })}
      />

      <Column fillWidth gap="8">
        <Text variant="label-strong-s">{t("banners.layer.position")}</Text>
        <Fields>
          <Num
            id={id("x")}
            label="X"
            value={layer.x}
            min={-BANNER_WIDTH}
            max={BANNER_WIDTH * 2}
            onChange={(x) => onChange({ x })}
          />
          <Num
            id={id("y")}
            label="Y"
            value={layer.y}
            min={-BANNER_HEIGHT}
            max={BANNER_HEIGHT * 2}
            onChange={(y) => onChange({ y })}
          />
          <Num
            id={id("w")}
            label={t("banners.layer.width")}
            value={layer.width}
            min={1}
            max={BANNER_WIDTH * 2}
            onChange={(width) => onChange({ width })}
          />
          <Num
            id={id("h")}
            label={t("banners.layer.height")}
            value={layer.height}
            min={1}
            max={BANNER_HEIGHT * 2}
            onChange={(height) => onChange({ height })}
          />
        </Fields>
        <Slider
          id={id("opacity")}
          label={t("banners.layer.opacity")}
          min={0}
          max={100}
          step={1}
          showValue
          value={layer.opacity}
          onChange={(opacity) => onChange({ opacity: Math.round(opacity) })}
        />
      </Column>

      {layer.type === "text" ? (
        <Column fillWidth gap="8">
          <Text variant="label-strong-s">{t("banners.layer.text.title")}</Text>
          <TextTools
            id={id("text")}
            value={layer.text}
            onValueChange={(text) => onChange({ text })}
            placeholderSet="banner"
            scenario={false}
            emoji={false}
          >
            <Input
              id={id("text")}
              label={t("banners.layer.text.label")}
              value={layer.text}
              maxLength={300}
              onChange={(e) => onChange({ text: e.target.value })}
            />
          </TextTools>
          <Text variant="body-default-xs" onBackground="neutral-weak" paddingX="4">
            {t("banners.layer.text.hint")}
          </Text>
          <SegmentedControl
            fillWidth
            value={layer.font}
            onChange={(font) => onChange({ font })}
            buttons={BANNER_FONTS.map((font) => ({ label: font, value: font }))}
          />
          <Fields>
            <Num
              id={id("size")}
              label={t("banners.layer.text.size")}
              value={layer.size}
              min={4}
              max={400}
              onChange={(size) => onChange({ size })}
            />
          </Fields>
          <SegmentedControl
            fillWidth
            value={layer.align}
            onChange={(align) => onChange({ align })}
            buttons={[
              { label: t("banners.layer.text.left"), value: "left" },
              { label: t("banners.layer.text.center"), value: "center" },
              { label: t("banners.layer.text.right"), value: "right" },
            ]}
          />
          <ColorInput
            id={id("color")}
            label={t("banners.layer.color")}
            supportAlpha
            value={layer.color}
            onChange={(e) => onChange({ color: e.target.value })}
          />
          <Switch
            label={t("banners.layer.text.shadow")}
            checked={layer.shadow}
            onToggle={() => onChange({ shadow: !layer.shadow })}
          />
        </Column>
      ) : null}

      {layer.type === "shape" ? (
        <Column fillWidth gap="8">
          <Text variant="label-strong-s">{t("banners.layer.shape.title")}</Text>
          <ColorInput
            id={id("color")}
            label={t("banners.layer.color")}
            supportAlpha
            value={layer.color}
            onChange={(e) => onChange({ color: e.target.value })}
          />
          <Row fillWidth gap="8" vertical="end">
            <Column flex="1" minWidth={0}>
              <Num
                id={id("radius")}
                label={t("banners.layer.radius")}
                value={Math.min(layer.radius, FULL_RADIUS)}
                min={0}
                max={FULL_RADIUS}
                onChange={(radius) => onChange({ radius })}
              />
            </Column>
            <IconButton
              icon="ellipse"
              variant="secondary"
              tooltip={t("banners.layer.roundest")}
              onClick={() => onChange({ radius: FULL_RADIUS })}
            />
          </Row>
          <Switch
            label={t("banners.layer.shape.stroke")}
            checked={Boolean(layer.stroke_color)}
            onToggle={() =>
              onChange(
                layer.stroke_color
                  ? { stroke_color: null, stroke_width: 0 }
                  : { stroke_color: "#ffffff", stroke_width: 4 },
              )
            }
          />
          {layer.stroke_color ? (
            <>
              <ColorInput
                id={id("stroke")}
                label={t("banners.layer.shape.strokeColor")}
                supportAlpha
                value={layer.stroke_color}
                onChange={(e) => onChange({ stroke_color: e.target.value })}
              />
              <Fields>
                <Num
                  id={id("stroke-width")}
                  label={t("banners.layer.shape.strokeWidth")}
                  value={layer.stroke_width}
                  min={1}
                  max={50}
                  onChange={(stroke_width) => onChange({ stroke_width })}
                />
              </Fields>
            </>
          ) : null}
        </Column>
      ) : null}

      {layer.type === "image" ? (
        <Column fillWidth gap="8">
          <Text variant="label-strong-s">{t("banners.layer.image.title")}</Text>
          <ImageSourceField
            id={id("src")}
            purpose="layer"
            label={t("banners.layer.image.link")}
            value={layer.src}
            onChange={(src) => onChange({ src })}
          />
          <Row fillWidth gap="8" vertical="end">
            <Column flex="1" minWidth={0}>
              <Num
                id={id("radius")}
                label={t("banners.layer.radius")}
                value={Math.min(layer.radius, FULL_RADIUS)}
                min={0}
                max={FULL_RADIUS}
                onChange={(radius) => onChange({ radius })}
              />
            </Column>
            <IconButton
              icon="ellipse"
              variant="secondary"
              tooltip={t("banners.layer.roundest")}
              onClick={() => onChange({ radius: FULL_RADIUS })}
            />
          </Row>
        </Column>
      ) : null}

      {layer.type === "avatar" ? (
        <Column fillWidth gap="8">
          <Text variant="label-strong-s">{t("banners.layer.avatar.title")}</Text>
          <SegmentedControl
            fillWidth
            value={layer.source}
            onChange={(source) => onChange({ source })}
            buttons={[
              { label: t("banners.layer.avatar.guildIcon"), value: "guild_icon" },
              { label: t("banners.layer.avatar.topMember"), value: "top_member" },
            ]}
          />
          <Text variant="body-default-xs" onBackground="neutral-weak" paddingX="4">
            {layer.source === "top_member"
              ? t("banners.layer.avatar.topHint")
              : t("banners.layer.avatar.iconHint")}
          </Text>
          <Row fillWidth gap="8" vertical="end">
            <Column flex="1" minWidth={0}>
              <Num
                id={id("radius")}
                label={t("banners.layer.radius")}
                value={Math.min(layer.radius, FULL_RADIUS)}
                min={0}
                max={FULL_RADIUS}
                onChange={(radius) => onChange({ radius })}
              />
            </Column>
            <IconButton
              icon="ellipse"
              variant="secondary"
              tooltip={t("banners.layer.roundest")}
              onClick={() => onChange({ radius: FULL_RADIUS })}
            />
          </Row>
          <ColorInput
            id={id("border")}
            label={t("banners.layer.avatar.borderColor")}
            supportAlpha
            value={layer.border_color}
            onChange={(e) => onChange({ border_color: e.target.value })}
          />
          <Fields>
            <Num
              id={id("border-width")}
              label={t("banners.layer.avatar.borderWidth")}
              value={layer.border_width}
              min={0}
              max={50}
              onChange={(border_width) => onChange({ border_width })}
            />
          </Fields>
        </Column>
      ) : null}

      {layer.type === "progress" ? (
        <Column fillWidth gap="8">
          <Text variant="label-strong-s">{t("banners.layer.progress.title")}</Text>
          <LabelSelect
            id={id("metric")}
            label={t("banners.layer.progress.metric")}
            options={METRICS.map((metric) => ({ label: t(metric.label), value: metric.value }))}
            selectedValue={layer.metric}
            setSelectedValue={(metric) => onChange({ metric })}
          />
          <Fields>
            <Num
              id={id("goal")}
              label={t("banners.layer.progress.goal")}
              value={layer.goal}
              min={1}
              max={100_000_000}
              onChange={(goal) => onChange({ goal })}
            />
          </Fields>
          <ColorInput
            id={id("color")}
            label={t("banners.layer.progress.fill")}
            supportAlpha
            value={layer.color}
            onChange={(e) => onChange({ color: e.target.value })}
          />
          <ColorInput
            id={id("track")}
            label={t("banners.layer.progress.track")}
            supportAlpha
            value={layer.track_color}
            onChange={(e) => onChange({ track_color: e.target.value })}
          />
          <Row fillWidth gap="8" vertical="end">
            <Column flex="1" minWidth={0}>
              <Num
                id={id("radius")}
                label={t("banners.layer.radius")}
                value={Math.min(layer.radius, FULL_RADIUS)}
                min={0}
                max={FULL_RADIUS}
                onChange={(radius) => onChange({ radius })}
              />
            </Column>
            <IconButton
              icon="ellipse"
              variant="secondary"
              tooltip={t("banners.layer.roundest")}
              onClick={() => onChange({ radius: FULL_RADIUS })}
            />
          </Row>
        </Column>
      ) : null}
    </Column>
  );
}
