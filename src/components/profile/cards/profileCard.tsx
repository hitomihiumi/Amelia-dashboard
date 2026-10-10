import { Filters, Gradient } from "@nmmty/lazycanvas";
import { Group, Image, Morph, Path2D, Text } from "@nmmty/adapter-react";
import {
  CARD_FONT,
  type CardColors,
  type CardIdentity,
  type CardStats,
  type CardTimeUnits,
  type ProfileIcon,
} from "./types";
import { formatVoiceTime, getNextLevelXP } from "./utils";

export const PROFILE_CARD_SIZE = { width: 736, height: 736 } as const;

const font = (size: number) => ({ family: CARD_FONT, size, weight: 400 });
const shadow = { color: "#000000", blur: 4, offsetX: 0, offsetY: 0 };

const BLOB_TOP = "M-104 187.97C326.971 -47.0652 784.644 -58.3726 807 135.471V528H-104V187.97Z";
const BLOB_BOTTOM =
  "M-69 32.1547C-69 32.1547 53.121 -40.1934 213.235 32.1547C373.349 104.503 868.618 313.505 929 186.23V347H-69V32.1547Z";

/**
 * The biography wraps inside a 310px column that has about 340px of height, so a long text
 * shrinks until the estimated number of lines fits. Same rule as the bot (ProfileCard.tsx).
 */
export function bioFontSize(bio: string): number {
  for (const size of [28, 24, 20]) {
    const charsPerLine = Math.floor(310 / (size * 0.52));
    const lines = Math.ceil(bio.length / charsPerLine);
    if (lines * size * 1.1 <= 340) return size;
  }
  return 18;
}

// The bot draws these in English whatever the language of the server is, and so does the preview.
const EMPTY_BIO = "This user has not set a biography yet.";

const COLUMNS = [0, 1, 2];
const ROWS = [0, 1, 2, 3];

/**
 * The `/profile` card, laid out exactly like `ProfileCard` of the bot
 * (src/helpers/canvas/ProfileCard.tsx).
 *
 * `iconSrc` turns an icon name into a picture; the bot has no icon pictures yet, so slots
 * without one show the same placeholder dot as an empty slot.
 */
export function profileCard(
  identity: CardIdentity,
  stats: CardStats,
  colors: CardColors,
  options: {
    bio: string | null;
    icons: ProfileIcon[];
    iconsPadding: number;
  },
  units: CardTimeUnits,
  micSrc: string,
  iconSrc: (name: string) => string | undefined = () => undefined,
) {
  const nextXp = getNextLevelXP(stats.level);
  const rawBar = (415 * Number(stats.xp)) / nextXp;
  const xpbar = Number.isFinite(rawBar) ? Math.max(rawBar, 30) : 30;
  const offset = Number((xpbar / 415).toFixed(3));
  const bio = options.bio || EMPTY_BIO;

  const gradient = new Gradient()
    .setType("linear")
    .setPoints({ x: 3, y: 182.5 }, { x: 418, y: 182.5 })
    .setStops(
      { offset, color: "#ffffff" },
      { offset: offset + 0.001, color: colors.second_component },
    );

  const slot = (col: number, row: number) => {
    const icon = options.icons.find((i) => i.pos[0] === col && i.pos[1] === row);
    const src = icon && icon.name !== "empty" ? iconSrc(icon.name) : undefined;
    if (!src) {
      return (
        <Group
          key={`${col}-${row}`}
          layout={{
            position: "relative",
            width: 60,
            height: 60,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Morph
            layout={{ position: "relative" }}
            size={{ width: 20, height: 20, radius: { all: 10 } }}
            color="#ffffff"
            opacity={0.5}
          />
        </Group>
      );
    }
    return (
      <Image
        key={`${col}-${row}`}
        layout={{ position: "relative", width: 60, height: 60 }}
        size={{ width: 60, height: 60 }}
        src={src}
      />
    );
  };

  return (
    <Morph
      layout={{
        width: 736,
        height: 736,
        padding: 0,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
      }}
      size={{ width: 736, height: 736, radius: { all: 30 } }}
      color={colors.bg_color}
    >
      <Group layout={{ position: "absolute", width: "100%", height: "100%" }}>
        <Path2D
          path2D={BLOB_TOP}
          color={colors.third_component}
          transform={{ translate: { x: 0, y: 208 } }}
          filter={Filters.blur(100)}
          globalComposite="source-atop"
        />
        <Path2D
          path2D={BLOB_BOTTOM}
          transform={{ translate: { x: 0, y: 440 } }}
          filter={Filters.blur(80)}
          color={colors.second_component}
          globalComposite="source-atop"
        />
      </Group>

      <Group
        layout={{
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: 20,
          gap: 20,
        }}
      >
        <Group
          layout={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
            height: 250,
            padding: 20,
            gap: 20,
          }}
        >
          <Group layout={{ position: "relative", width: 220, height: 220 }}>
            <Image size={{ width: 220, height: 220, radius: { all: 110 } }} src={identity.avatar} />
            <Morph
              layout={{ position: "absolute" }}
              size={{ width: 220, height: 220, radius: { all: 110 } }}
              stroke={{ width: 3 }}
              color={colors.second_component}
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
              align="left"
              color="#ffffff"
              shadow={shadow}
            />
            <Text
              text={identity.username}
              font={font(32)}
              align="left"
              color="#ffffff"
              shadow={shadow}
            />
            <Morph
              layout={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                position: "relative",
                width: 421,
                height: 36,
              }}
              size={{ width: 421, height: 36, radius: { all: 17.5 } }}
              color="#ffffff"
            >
              <Morph
                layout={{ position: "absolute", left: 3, top: 3 }}
                size={{ width: xpbar, height: 30, radius: { all: 15 } }}
                color={colors.second_component}
                centring="start"
              />
              <Text
                layout={{ margin: [0, 0, 0, 20] }}
                text={`LEVEL ${stats.level}`}
                font={font(16)}
                color={gradient}
                baseline="middle"
                align="left"
              />
              <Text
                layout={{ margin: [0, 20, 0, 0] }}
                text={`${stats.xp}/${nextXp}`}
                font={font(16)}
                color={gradient}
                baseline="middle"
                align="right"
              />
            </Morph>
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
        </Group>

        <Group
          layout={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: 476,
            gap: 10,
          }}
        >
          <Group
            layout={{
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: 20,
              width: 430,
              height: 476,
            }}
          >
            <Morph
              layout={{ width: 180, height: 40, alignItems: "center", justifyContent: "center" }}
              size={{ width: 180, height: 40, radius: { all: 20 } }}
              color="#ffffff"
            >
              <Text
                text="Biography"
                font={font(32)}
                color="#000000"
                baseline="middle"
                align="center"
              />
            </Morph>
            <Text
              layout={{ width: 310, height: 380 }}
              size={{ width: 310, height: 380 }}
              multiline={{ enabled: true, spacing: 1.1 }}
              text={bio}
              font={font(bioFontSize(bio))}
              color="#ffffff"
              align="center"
              shadow={shadow}
            />
          </Group>
          <Group
            layout={{
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: 20,
              width: 200,
              height: 476,
            }}
          >
            <Morph
              layout={{
                position: "relative",
                width: 180,
                height: 40,
                alignItems: "center",
                justifyContent: "center",
              }}
              size={{ width: 180, height: 40, radius: { all: 20 } }}
              color="#ffffff"
            >
              <Text text="Icons" font={font(32)} color="#000000" baseline="middle" align="center" />
            </Morph>
            <Group
              layout={{
                flexDirection: "row",
                width: 200,
                height: 350,
                alignItems: "center",
                justifyContent: "center",
                gap: options.iconsPadding,
              }}
            >
              {COLUMNS.map((col) => (
                <Group
                  key={col}
                  layout={{
                    flexDirection: "column",
                    position: "relative",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 60,
                    height: 270,
                    gap: options.iconsPadding,
                  }}
                >
                  {ROWS.map((row) => slot(col, row))}
                </Group>
              ))}
            </Group>
          </Group>
        </Group>
      </Group>

      <Morph
        layout={{ position: "absolute", width: 733, height: 733, top: 1, left: 1 }}
        size={{ width: 733, height: 733, radius: { all: 28 } }}
        stroke={{ width: 3 }}
        color={colors.second_component}
      />
    </Morph>
  );
}
