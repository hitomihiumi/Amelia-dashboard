import { Group, Image, Morph, Text } from "@nmmty/adapter-react";
import { Filters, Gradient } from "@nmmty/lazycanvas";
import type { ReactElement } from "react";
import { uploadId, uploadUrl } from "@/lib/banners/images";
import { fillBannerText, metricValue } from "@/lib/banners/placeholders";
import {
  BANNER_HEIGHT,
  BANNER_WIDTH,
  type BannerBackground,
  type BannerLayer,
  type BannerStats,
  type ServerBanner,
} from "@/lib/db/types";

/**
 * The layer tree of a banner, drawn in the browser with LazyCanvas. It is the same tree the bot
 * draws to a PNG (`src/helpers/banner/render.tsx` of the bot), so what is edited here is what
 * ends up as the server banner. Keep the two in step.
 */

type Node = ReactElement;

/**
 * Where the canvas loads a picture from. An upload comes from the image route of the dashboard,
 * pictures of other sites go through the proxy of the site, so the canvas can read them.
 */
export function bannerImageSrc(link: string, guildId: string): string {
  const trimmed = link.trim();
  if (!trimmed) return "";
  const upload = uploadId(trimmed);
  if (upload) return uploadUrl(guildId, upload);
  try {
    const url = new URL(trimmed);
    if (url.hostname === "cdn.discordapp.com" || url.hostname === "media.discordapp.net")
      return trimmed;
    return `/api/og/proxy?url=${encodeURIComponent(trimmed)}`;
  } catch {
    return "";
  }
}

const box = (layer: BannerLayer) => ({
  position: "absolute" as const,
  left: Math.round(layer.x),
  top: Math.round(layer.y),
  width: Math.round(layer.width),
  height: Math.round(layer.height),
});

const radiusOf = (radius: number, layer: BannerLayer) =>
  Math.round(Math.min(radius, layer.width / 2, layer.height / 2));

/** Start and end of a CSS-style linear gradient (0° is up, 90° is right) across the banner. */
export function gradientLine(angle: number) {
  const rad = (angle * Math.PI) / 180;
  const dx = Math.sin(rad);
  const dy = -Math.cos(rad);
  const half = (Math.abs(BANNER_WIDTH * dx) + Math.abs(BANNER_HEIGHT * dy)) / 2;
  const cx = BANNER_WIDTH / 2;
  const cy = BANNER_HEIGHT / 2;
  return {
    from: { x: cx - dx * half, y: cy - dy * half },
    to: { x: cx + dx * half, y: cy + dy * half },
  };
}

const full = {
  position: "absolute" as const,
  left: 0,
  top: 0,
  width: BANNER_WIDTH,
  height: BANNER_HEIGHT,
};
const fullSize = { width: BANNER_WIDTH, height: BANNER_HEIGHT, radius: { all: 0 } };

function backgroundNodes(
  background: BannerBackground,
  stats: BannerStats,
  timezone: string,
  guildId: string,
): Node[] {
  if (background.type === "gradient") {
    const line = gradientLine(background.angle);
    const gradient = new Gradient()
      .setType("linear")
      .setPoints(line.from, line.to)
      .setStops({ offset: 0, color: background.from }, { offset: 1, color: background.to });
    return [<Morph key="bg" layout={full} size={fullSize} color={gradient} />];
  }

  if (background.type === "image") {
    const src = bannerImageSrc(fillBannerText(background.src, stats, timezone), guildId);
    const nodes: Node[] = [
      <Morph key="bg" layout={full} size={fullSize} color={background.color} />,
    ];
    if (src) {
      const bleed = background.blur > 0 ? background.blur * 2 : 0;
      nodes.push(
        <Image
          key="bg-image"
          layout={{
            position: "absolute",
            left: -bleed,
            top: -bleed,
            width: BANNER_WIDTH + bleed * 2,
            height: BANNER_HEIGHT + bleed * 2,
          }}
          size={{ width: BANNER_WIDTH + bleed * 2, height: BANNER_HEIGHT + bleed * 2 }}
          src={src}
          filter={background.blur > 0 ? Filters.blur(background.blur) : undefined}
        />,
      );
      if (background.dim > 0) {
        nodes.push(
          <Morph
            key="bg-dim"
            layout={full}
            size={fullSize}
            color={background.color}
            opacity={background.dim / 100}
          />,
        );
      }
    }
    return nodes;
  }

  return [<Morph key="bg" layout={full} size={fullSize} color={background.color} />];
}

function layerNodes(
  layer: BannerLayer,
  stats: BannerStats,
  timezone: string,
  guildId: string,
): Node[] {
  const opacity = layer.opacity / 100;
  const k = layer.id;

  switch (layer.type) {
    case "shape": {
      const size = {
        width: Math.round(layer.width),
        height: Math.round(layer.height),
        radius: { all: radiusOf(layer.radius, layer) },
      };
      return [
        <Morph
          key={`${k}-fill`}
          layout={box(layer)}
          size={size}
          color={layer.color}
          opacity={opacity}
        />,
        ...(layer.stroke_color && layer.stroke_width > 0
          ? [
              <Morph
                key={`${k}-stroke`}
                layout={box(layer)}
                size={size}
                color={layer.stroke_color}
                stroke={{ width: layer.stroke_width }}
                opacity={opacity}
              />,
            ]
          : []),
      ];
    }

    case "text": {
      const value = fillBannerText(layer.text, stats, timezone);
      if (!value) return [];
      const justify =
        layer.align === "center" ? "center" : layer.align === "right" ? "flex-end" : "flex-start";
      return [
        <Group
          key={k}
          layout={{
            ...box(layer),
            flexDirection: "row",
            alignItems: "center",
            justifyContent: justify,
          }}
        >
          <Text
            text={value}
            font={{ family: layer.font, size: layer.size, weight: 400 }}
            color={layer.color}
            align={layer.align}
            baseline="middle"
            shadow={layer.shadow ? { color: "#000000", blur: 4, offsetY: 1 } : undefined}
            opacity={opacity}
          />
        </Group>,
      ];
    }

    case "image":
    case "avatar": {
      const link =
        layer.type === "avatar"
          ? layer.source === "top_member"
            ? (stats.top?.avatar ?? "")
            : stats.guild_icon
          : fillBannerText(layer.src, stats, timezone);
      const src = bannerImageSrc(link, guildId);
      const size = {
        width: Math.round(layer.width),
        height: Math.round(layer.height),
        radius: { all: radiusOf(layer.radius, layer) },
      };

      const nodes: Node[] = [];
      if (layer.type === "avatar" && layer.border_width > 0) {
        nodes.push(
          <Morph
            key={`${k}-border`}
            layout={box(layer)}
            size={size}
            color={layer.border_color}
            stroke={{ width: layer.border_width }}
            opacity={opacity}
          />,
        );
      }
      nodes.push(
        src ? (
          <Image
            key={`${k}-image`}
            layout={box(layer)}
            size={size}
            src={src}
            placeholder={{ color: "rgba(255,255,255,0.12)" }}
            opacity={opacity}
          />
        ) : (
          // No picture (nobody has written yet, no link): the quiet stand-in the bot draws too.
          <Morph
            key={`${k}-empty`}
            layout={box(layer)}
            size={size}
            color="rgba(255,255,255,0.12)"
            opacity={opacity}
          />
        ),
      );
      return nodes;
    }

    case "progress": {
      const ratio = Math.min(1, Math.max(0, metricValue(stats, layer.metric) / layer.goal));
      const width = Math.round(layer.width);
      const height = Math.round(layer.height);
      const radius = radiusOf(layer.radius, layer);
      const filled = ratio === 0 ? 0 : Math.max(Math.min(height, width), Math.round(width * ratio));
      return [
        <Morph
          key={`${k}-track`}
          layout={box(layer)}
          size={{ width, height, radius: { all: radius } }}
          color={layer.track_color}
          opacity={opacity}
        />,
        ...(filled > 0
          ? [
              <Morph
                key={`${k}-fill`}
                layout={{ ...box(layer), width: filled }}
                size={{ width: filled, height, radius: { all: radius } }}
                color={layer.color}
                opacity={opacity}
              />,
            ]
          : []),
      ];
    }
  }
}

/** The whole banner as a LazyCanvas layer tree. */
export function bannerScene(banner: ServerBanner, stats: BannerStats, guildId: string): Node {
  const nodes: Node[] = backgroundNodes(banner.background, stats, banner.timezone, guildId);
  for (const layer of banner.layers) {
    if (layer.visible) nodes.push(...layerNodes(layer, stats, banner.timezone, guildId));
  }

  return (
    <Group layout={{ width: BANNER_WIDTH, height: BANNER_HEIGHT, position: "relative" }}>
      {nodes}
    </Group>
  );
}
