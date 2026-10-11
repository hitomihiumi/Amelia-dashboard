import { Image, Morph } from "@nmmty/adapter-react";

/** The picture behind a card and how much it is darkened, as the preview draws it. */
export interface CardBackgroundSpec {
  src: string;
  /** 0-100 */
  dim: number;
}

/**
 * The picture behind a card, drawn like the bot draws it (`cardBackground.tsx` of the bot): it was
 * cut to the size of the card when it was uploaded, so it is drawn as it is, with the corners of
 * the card, and darkened so the text on top stays readable. It replaces the coloured blobs.
 */
export function cardBackgroundLayers(
  background: CardBackgroundSpec,
  width: number,
  height: number,
  radius: number,
) {
  const layout = { position: "absolute" as const, left: 0, top: 0, width, height };
  const size = { width, height, radius: { all: radius } };
  const darkness = Math.min(100, Math.max(0, background.dim)) / 100;

  return [
    <Image key="background" layout={layout} size={size} src={background.src} />,
    ...(darkness > 0
      ? [
          <Morph
            key="background-dim"
            layout={layout}
            size={size}
            color="#000000"
            opacity={darkness}
          />,
        ]
      : []),
  ];
}
