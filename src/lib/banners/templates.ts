import {
  BANNER_HEIGHT,
  BANNER_WIDTH,
  type BannerLayer,
  type BannerStats,
  type ServerBanner,
} from "@/lib/db/types";
import { generateID } from "@/lib/db/generateID";

export type BannerLayerType = BannerLayer["type"];
export type BannerTemplateId = "stats" | "top" | "minimal" | "goal";
export const BANNER_TEMPLATES: readonly BannerTemplateId[] = ["stats", "top", "minimal", "goal"];

/** The words templates put on the canvas; they follow the language of the dashboard. */
export interface TemplateLabels {
  members: string;
  online: string;
  voice: string;
  boosts: string;
  mostActive: string;
  messages: string;
  goal: string;
}

const WHITE = "#ffffff";
const SOFT = "rgba(255,255,255,0.72)";
const GLASS = "rgba(255,255,255,0.1)";

type Common = "id" | "name" | "opacity" | "visible";
type Box = { x: number; y: number; width: number; height: number };

const base = (name: string): Pick<BannerLayer, Common> => ({
  id: generateID(),
  name,
  opacity: 100,
  visible: true,
});

function text(
  name: string,
  box: Box,
  value: string,
  options: Partial<Extract<BannerLayer, { type: "text" }>> = {},
): BannerLayer {
  return {
    ...base(name),
    ...box,
    type: "text",
    text: value,
    font: "Geist Mono",
    size: 28,
    color: WHITE,
    align: "left",
    shadow: false,
    ...options,
  };
}

function shape(
  name: string,
  box: Box,
  color: string,
  radius = 0,
  options: Partial<Extract<BannerLayer, { type: "shape" }>> = {},
): BannerLayer {
  return {
    ...base(name),
    ...box,
    type: "shape",
    color,
    radius,
    stroke_color: null,
    stroke_width: 0,
    ...options,
  };
}

function avatar(
  name: string,
  box: Box,
  source: "guild_icon" | "top_member",
  border = WHITE,
): BannerLayer {
  return {
    ...base(name),
    ...box,
    type: "avatar",
    source,
    radius: 2000,
    border_color: border,
    border_width: 4,
  };
}

/** A banner of the default size, centred where it fits. */
export function defaultLayer(type: BannerLayerType, name: string, text_: string): BannerLayer {
  const box = (width: number, height: number): Box => ({
    x: Math.round((BANNER_WIDTH - width) / 2),
    y: Math.round((BANNER_HEIGHT - height) / 2),
    width,
    height,
  });

  switch (type) {
    case "text":
      return text(name, box(520, 60), text_, { size: 40, align: "center" });
    case "shape":
      return shape(name, box(320, 160), GLASS, 24);
    case "image":
      return { ...base(name), ...box(200, 200), type: "image", src: "", radius: 24 };
    case "avatar":
      return avatar(name, box(160, 160), "guild_icon");
    case "progress":
      return {
        ...base(name),
        ...box(480, 28),
        type: "progress",
        metric: "members",
        goal: 1000,
        color: "#7c5cff",
        track_color: "rgba(255,255,255,0.18)",
        radius: 2000,
      };
  }
}

/** A tile with a big number and its caption, on a frosted card. */
function tile(x: number, y: number, width: number, value: string, caption: string): BannerLayer[] {
  return [
    shape(caption, { x, y, width, height: 190 }, GLASS, 28),
    text(`${caption}: value`, { x, y: y + 28, width, height: 90 }, value, {
      font: "WDXL Lubrifont",
      size: 72,
      align: "center",
      shadow: true,
    }),
    text(`${caption}: caption`, { x, y: y + 128, width, height: 40 }, caption, {
      size: 22,
      align: "center",
      color: SOFT,
    }),
  ];
}

/** A new banner made from one of the templates. */
export function createBanner(
  template: BannerTemplateId,
  name: string,
  labels: TemplateLabels,
): ServerBanner {
  const common = { id: generateID(), name, timezone: "UTC" };

  switch (template) {
    case "stats":
      return {
        ...common,
        background: { type: "gradient", from: "#1b1f3b", to: "#7c3aed", angle: 135 },
        layers: [
          shape("Card", { x: 40, y: 40, width: 880, height: 460 }, "rgba(0,0,0,0.35)", 36),
          avatar("Server icon", { x: 80, y: 80, width: 130, height: 130 }, "guild_icon"),
          text("Server name", { x: 240, y: 90, width: 640, height: 70 }, "{guild.name}", {
            font: "WDXL Lubrifont",
            size: 56,
            shadow: true,
          }),
          text("Date", { x: 240, y: 168, width: 640, height: 36 }, "{date} · {time}", {
            size: 22,
            color: SOFT,
          }),
          ...tile(80, 270, 248, "{members}", labels.members),
          ...tile(356, 270, 248, "{members.online}", labels.online),
          ...tile(632, 270, 248, "{voice.members}", labels.voice),
        ],
      };

    case "top":
      return {
        ...common,
        background: { type: "gradient", from: "#0f172a", to: "#334155", angle: 160 },
        layers: [
          text("Title", { x: 60, y: 50, width: 840, height: 60 }, labels.mostActive, {
            font: "WDXL Lubrifont",
            size: 44,
            align: "center",
            color: "#fbbf24",
          }),
          avatar(
            "Most active member",
            { x: 90, y: 160, width: 260, height: 260 },
            "top_member",
            "#fbbf24",
          ),
          text("Name", { x: 390, y: 190, width: 500, height: 80 }, "{top.name}", {
            font: "WDXL Lubrifont",
            size: 60,
            shadow: true,
          }),
          text(
            "Messages",
            { x: 390, y: 280, width: 500, height: 44 },
            `{top.messages} ${labels.messages}`,
            {
              size: 28,
              color: SOFT,
            },
          ),
          shape("Members card", { x: 390, y: 360, width: 240, height: 90 }, GLASS, 22),
          text("Members", { x: 390, y: 372, width: 240, height: 66 }, "{members}", {
            font: "WDXL Lubrifont",
            size: 44,
            align: "center",
          }),
          shape("Online card", { x: 650, y: 360, width: 240, height: 90 }, GLASS, 22),
          text("Online", { x: 650, y: 372, width: 240, height: 66 }, "{members.online}", {
            font: "WDXL Lubrifont",
            size: 44,
            align: "center",
            color: "#4ade80",
          }),
          text("Footer", { x: 60, y: 470, width: 840, height: 36 }, "{guild.name}", {
            size: 20,
            align: "center",
            color: SOFT,
          }),
        ],
      };

    case "minimal":
      return {
        ...common,
        background: { type: "color", color: "#111827" },
        layers: [
          text("Members", { x: 80, y: 130, width: 800, height: 200 }, "{members}", {
            font: "WDXL Lubrifont",
            size: 190,
            align: "center",
            shadow: true,
          }),
          text("Caption", { x: 80, y: 335, width: 800, height: 50 }, labels.members, {
            size: 32,
            align: "center",
            color: SOFT,
          }),
          shape("Line", { x: 380, y: 410, width: 200, height: 4 }, "#7c5cff", 2),
          text("Server name", { x: 80, y: 430, width: 800, height: 44 }, "{guild.name}", {
            size: 24,
            align: "center",
            color: SOFT,
          }),
        ],
      };

    case "goal":
      return {
        ...common,
        background: { type: "gradient", from: "#064e3b", to: "#0f766e", angle: 120 },
        layers: [
          avatar("Server icon", { x: 80, y: 80, width: 110, height: 110 }, "guild_icon"),
          text("Server name", { x: 215, y: 98, width: 660, height: 70 }, "{guild.name}", {
            font: "WDXL Lubrifont",
            size: 52,
            shadow: true,
          }),
          text("Goal title", { x: 80, y: 250, width: 800, height: 50 }, labels.goal, {
            size: 30,
            color: SOFT,
          }),
          text("Goal value", { x: 80, y: 305, width: 800, height: 90 }, "{members} / 1000", {
            font: "WDXL Lubrifont",
            size: 76,
          }),
          {
            ...base("Progress"),
            x: 80,
            y: 415,
            width: 800,
            height: 36,
            type: "progress",
            metric: "members",
            goal: 1000,
            color: "#fbbf24",
            track_color: "rgba(255,255,255,0.2)",
            radius: 2000,
          },
        ],
      };
  }
}

/** Numbers the preview shows when the server has no real ones for them yet. */
export const SAMPLE_STATS: BannerStats = {
  guild_name: "Amelia Land",
  guild_icon: "",
  members: 1280,
  members_online: 342,
  voice_members: 17,
  boosts: 14,
  boost_tier: 3,
  messages_today: 5120,
  messages_week: 30400,
  joins_today: 12,
  leaves_today: 3,
  channels: 40,
  roles: 22,
  top: { name: "Nova", avatar: "", messages: 214 },
};
