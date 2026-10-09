import { Filters, Gradient } from "@nmmty/lazycanvas";
import { Group, Image, Morph, Path2D, Text } from "@nmmty/adapter-react";
import {
  CARD_FONT,
  type CardColors,
  type CardIdentity,
  type CardStats,
  type CardTimeUnits,
} from "./types";
import { formatVoiceTime, getNextLevelXP } from "./utils";

export const RANK_CARD_SIZE = { width: 736, height: 260 } as const;

const font = (size: number) => ({ family: CARD_FONT, size, weight: 400 });
const shadow = { color: "#000000", blur: 4 };

/** An ellipse as an SVG path, so no `Path2D` is needed while rendering on the server. */
const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`;

/**
 * The `/rank` card, laid out exactly like `RankCard` of the bot (src/helpers/canvas/RankCard.tsx).
 * Written as a plain function, not a component: `<Scene>` only understands LazyCanvas elements.
 */
export function rankCard(
  identity: CardIdentity,
  stats: CardStats,
  colors: CardColors,
  units: CardTimeUnits,
  micSrc: string,
) {
  const nextXp = getNextLevelXP(stats.level);
  const rawBar = (475 * Number(stats.xp)) / nextXp;
  const xpbar = Number.isFinite(rawBar) ? Math.max(rawBar, 30) : 30;
  const offset = Number((xpbar / 475).toFixed(3));

  // White over the filled part of the bar, the accent colour over the rest.
  const gradient = new Gradient()
    .setType("linear")
    .setPoints({ x: 3, y: 202.5 }, { x: 478, y: 202.5 })
    .setStops(
      { offset, color: "#ffffff" },
      { offset: offset + 0.001, color: colors.second_component },
    );

  return (
    <Morph
      layout={{
        width: 736,
        height: 260,
        padding: 0,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
      }}
      size={{ width: 736, height: 260, radius: { all: 30 } }}
      color={colors.bg_color}
    >
      <Group layout={{ position: "absolute", width: "100%", height: "100%" }}>
        <Path2D
          path2D={ellipse(368, 300, 400, 200)}
          color={colors.first_component}
          filter={Filters.blur(50)}
          globalComposite="source-atop"
        />
        <Path2D
          path2D={ellipse(368, 350, 400, 200)}
          color={colors.second_component}
          filter={Filters.blur(40)}
          globalComposite="source-atop"
        />
        <Path2D
          path2D={ellipse(368, 400, 400, 200)}
          color={colors.third_component}
          filter={Filters.blur(80)}
        />
      </Group>

      <Group
        layout={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: 20,
          gap: 20,
        }}
      >
        <Group layout={{ position: "relative", width: 180, height: 180 }}>
          <Image size={{ width: 180, height: 180, radius: { all: 90 } }} src={identity.avatar} />
          <Morph
            layout={{ position: "absolute" }}
            size={{ width: 180, height: 180, radius: { all: 90 } }}
            color={colors.second_component}
            stroke={{ width: 3 }}
          />
        </Group>
        <Group
          layout={{
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "center",
            flexGrow: 1,
            gap: 10,
          }}
        >
          <Text
            text={identity.globalName}
            font={font(64)}
            align="start"
            color="#ffffff"
            shadow={shadow}
          />
          <Group
            layout={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
            }}
          >
            <Text
              text={identity.username}
              font={font(32)}
              align="start"
              color="#ffffff"
              shadow={shadow}
            />
            <Morph
              layout={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                width: 180,
                height: 35,
                margin: [0, 20, 0, 0],
              }}
              size={{ width: 180, height: 35, radius: { all: 17.5 } }}
              color="#ffffff"
            >
              <Text
                layout={{ position: "absolute" }}
                text={formatVoiceTime(stats.voice_time, units)}
                font={font(24)}
                align="center"
                baseline="middle"
                color="#000000"
              />
              <Image
                layout={{ position: "absolute", left: 140 }}
                size={{ width: 25, height: 25 }}
                src={micSrc}
              />
            </Morph>
          </Group>
          <Morph
            layout={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              position: "relative",
              width: 481,
              height: 36,
            }}
            size={{ width: 481, height: 36, radius: { all: 18 } }}
            color="#ffffff"
          >
            <Morph
              layout={{ position: "absolute", left: 3, top: 3 }}
              size={{ width: xpbar, height: 30, radius: { all: 15 } }}
              color={colors.second_component}
            />
            <Text
              layout={{ margin: [0, 0, 0, 20] }}
              text={`LEVEL ${stats.level}`}
              font={font(16)}
              align="left"
              baseline="middle"
              color={gradient}
            />
            <Text
              layout={{ margin: [0, 20, 0, 0] }}
              text={`${stats.xp}/${nextXp}`}
              font={font(16)}
              align="right"
              baseline="middle"
              color={gradient}
            />
          </Morph>
        </Group>
      </Group>

      <Morph
        layout={{ position: "absolute", width: 733, height: 257, top: 1, left: 1 }}
        size={{ width: 733, height: 257, radius: { all: 28 } }}
        color={colors.second_component}
        stroke={{ width: 3 }}
      />
    </Morph>
  );
}
