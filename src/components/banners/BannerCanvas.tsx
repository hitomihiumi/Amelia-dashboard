"use client";

import "@/components/profile/cards/cardFonts.css";
import { Scene } from "@nmmty/adapter-react";
import { Column, Flex } from "@once-ui-system/core";
import { useDeferredValue, useMemo, useRef, useState } from "react";
import { bannerScene } from "./bannerScene";
import {
  BANNER_HEIGHT,
  BANNER_WIDTH,
  type BannerLayer,
  type BannerStats,
  type ServerBanner,
} from "@/lib/db/types";

type Rect = { x: number; y: number; width: number; height: number };
type Handle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const HANDLE_POSITION: Record<Handle, { left: string; top: string; cursor: string }> = {
  nw: { left: "0%", top: "0%", cursor: "nwse-resize" },
  n: { left: "50%", top: "0%", cursor: "ns-resize" },
  ne: { left: "100%", top: "0%", cursor: "nesw-resize" },
  e: { left: "100%", top: "50%", cursor: "ew-resize" },
  se: { left: "100%", top: "100%", cursor: "nwse-resize" },
  s: { left: "50%", top: "100%", cursor: "ns-resize" },
  sw: { left: "0%", top: "100%", cursor: "nesw-resize" },
  w: { left: "0%", top: "50%", cursor: "ew-resize" },
};

/** Within this many canvas pixels a layer sticks to the edges and the centre of the banner. */
const SNAP = 6;
const MIN_SIZE = 4;
const LIMIT = {
  x: [-BANNER_WIDTH, BANNER_WIDTH * 2],
  y: [-BANNER_HEIGHT, BANNER_HEIGHT * 2],
} as const;

interface Drag {
  mode: "move" | Handle;
  id: string;
  pointerX: number;
  pointerY: number;
  start: Rect;
  scale: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Pulls `value` onto the nearest of `targets` when it is close enough. */
function snap(value: number, targets: number[]): { value: number; hit: number | null } {
  for (const target of targets) {
    if (Math.abs(value - target) <= SNAP) return { value: target, hit: target };
  }
  return { value, hit: null };
}

export interface BannerCanvasProps {
  guildId: string;
  banner: ServerBanner;
  stats: BannerStats;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** A layer was moved or resized. */
  onChangeLayer: (id: string, patch: Partial<Rect>) => void;
  /** Files dropped onto the canvas (pictures to add as elements). */
  onDropFiles?: (files: File[]) => void;
}

/**
 * The banner drawn with LazyCanvas, with an overlay on top to edit it with the mouse: click a
 * layer to select it, drag it to move it, drag a handle to resize it, press the arrow keys to
 * nudge it (Shift for bigger steps). Layers stick to the edges and the centre of the banner.
 */
export function BannerCanvas({
  guildId,
  banner,
  stats,
  selectedId,
  onSelect,
  onChangeLayer,
  onDropFiles,
}: BannerCanvasProps) {
  // Dragging changes the banner on every pointer event and each change is a redraw of the whole
  // canvas; the deferred copy is drawn for the position the pointer stopped on, while the
  // overlay (cheap) follows the pointer at once.
  const drawn = useDeferredValue(banner);
  const tree = useMemo(() => bannerScene(drawn, stats, guildId), [drawn, stats, guildId]);

  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const [guides, setGuides] = useState<{ x: number | null; y: number | null }>({
    x: null,
    y: null,
  });

  const selected = banner.layers.find((layer) => layer.id === selectedId) ?? null;

  const begin = (event: React.PointerEvent, layer: BannerLayer, mode: Drag["mode"]) => {
    const frame = frameRef.current;
    if (!frame || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    frame.focus({ preventScroll: true });
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);

    onSelect(layer.id);
    drag.current = {
      mode,
      id: layer.id,
      pointerX: event.clientX,
      pointerY: event.clientY,
      start: { x: layer.x, y: layer.y, width: layer.width, height: layer.height },
      scale: frame.getBoundingClientRect().width / BANNER_WIDTH,
    };
  };

  const move = (event: React.PointerEvent) => {
    const current = drag.current;
    if (!current || current.scale <= 0) return;

    const dx = (event.clientX - current.pointerX) / current.scale;
    const dy = (event.clientY - current.pointerY) / current.scale;
    const { start } = current;
    const next: Rect = { ...start };
    let guideX: number | null = null;
    let guideY: number | null = null;

    if (current.mode === "move") {
      const x = snap(start.x + dx, [
        0,
        (BANNER_WIDTH - start.width) / 2,
        BANNER_WIDTH - start.width,
      ]);
      const y = snap(start.y + dy, [
        0,
        (BANNER_HEIGHT - start.height) / 2,
        BANNER_HEIGHT - start.height,
      ]);
      next.x = x.value;
      next.y = y.value;
      // The guide sits on the edge or the centre the layer stuck to.
      if (x.hit !== null)
        guideX =
          x.hit === 0 ? 0 : x.hit === BANNER_WIDTH - start.width ? BANNER_WIDTH : BANNER_WIDTH / 2;
      if (y.hit !== null)
        guideY =
          y.hit === 0
            ? 0
            : y.hit === BANNER_HEIGHT - start.height
              ? BANNER_HEIGHT
              : BANNER_HEIGHT / 2;
    } else {
      const west = current.mode.includes("w");
      const east = current.mode.includes("e");
      const north = current.mode.includes("n");
      const south = current.mode.includes("s");

      if (east)
        next.width = Math.max(
          MIN_SIZE,
          snap(start.x + start.width + dx, [BANNER_WIDTH]).value - start.x,
        );
      if (south)
        next.height = Math.max(
          MIN_SIZE,
          snap(start.y + start.height + dy, [BANNER_HEIGHT]).value - start.y,
        );
      if (west) {
        const left = Math.min(snap(start.x + dx, [0]).value, start.x + start.width - MIN_SIZE);
        next.x = left;
        next.width = start.x + start.width - left;
      }
      if (north) {
        const top = Math.min(snap(start.y + dy, [0]).value, start.y + start.height - MIN_SIZE);
        next.y = top;
        next.height = start.y + start.height - top;
      }
    }

    setGuides({ x: guideX, y: guideY });
    onChangeLayer(current.id, {
      x: Math.round(clamp(next.x, LIMIT.x[0], LIMIT.x[1])),
      y: Math.round(clamp(next.y, LIMIT.y[0], LIMIT.y[1])),
      width: Math.round(next.width),
      height: Math.round(next.height),
    });
  };

  const end = () => {
    drag.current = null;
    setGuides({ x: null, y: null });
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!selected) return;
    const step = event.shiftKey ? 10 : 1;
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const change = delta[event.key];
    if (change) {
      event.preventDefault();
      onChangeLayer(selected.id, { x: selected.x + change[0], y: selected.y + change[1] });
    } else if (event.key === "Escape") {
      onSelect(null);
    }
  };

  const percent = (value: number, total: number) => `${(value / total) * 100}%`;
  const visible = banner.layers.filter((layer) => layer.visible);
  // The selected layer is drawn last so its handles are never covered by another layer.
  const ordered = selected?.visible
    ? [...visible.filter((layer) => layer.id !== selected.id), selected]
    : visible;

  return (
    <Column
      ref={frameRef}
      fillWidth
      position="relative"
      overflow="hidden"
      radius="m"
      border="neutral-medium"
      tabIndex={0}
      role="application"
      aria-label={banner.name}
      onKeyDown={onKeyDown}
      onDragOver={(event) => {
        if (onDropFiles && event.dataTransfer.types.includes("Files")) event.preventDefault();
      }}
      onDrop={(event) => {
        const files = [...event.dataTransfer.files].filter((file) =>
          file.type.startsWith("image/"),
        );
        if (!onDropFiles || files.length === 0) return;
        event.preventDefault();
        onDropFiles(files);
      }}
      style={{
        aspectRatio: `${BANNER_WIDTH} / ${BANNER_HEIGHT}`,
        outline: "none",
        touchAction: "none",
      }}
    >
      <Scene
        width={BANNER_WIDTH}
        height={BANNER_HEIGHT}
        style={{ width: "100%", height: "100%", display: "block" }}
      >
        {tree}
      </Scene>

      <Flex
        position="absolute"
        top="0"
        left="0"
        fill
        onPointerDown={() => onSelect(null)}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      >
        {guides.x !== null ? (
          <Flex
            position="absolute"
            background="brand-strong"
            style={{
              left: percent(guides.x, BANNER_WIDTH),
              top: 0,
              bottom: 0,
              width: 1,
              pointerEvents: "none",
            }}
          />
        ) : null}
        {guides.y !== null ? (
          <Flex
            position="absolute"
            background="brand-strong"
            style={{
              top: percent(guides.y, BANNER_HEIGHT),
              left: 0,
              right: 0,
              height: 1,
              pointerEvents: "none",
            }}
          />
        ) : null}

        {ordered.map((layer) => {
          const isSelected = layer.id === selectedId;
          return (
            <Flex
              key={layer.id}
              position="absolute"
              title={layer.name}
              onPointerDown={(event) => begin(event, layer, "move")}
              style={{
                left: percent(layer.x, BANNER_WIDTH),
                top: percent(layer.y, BANNER_HEIGHT),
                width: percent(layer.width, BANNER_WIDTH),
                height: percent(layer.height, BANNER_HEIGHT),
                cursor: isSelected ? "move" : "pointer",
                outline: isSelected
                  ? "2px solid var(--brand-solid-strong)"
                  : "1px solid transparent",
                outlineOffset: -1,
              }}
            >
              {isSelected
                ? HANDLES.map((handle) => (
                    <Flex
                      key={handle}
                      position="absolute"
                      background="brand-strong"
                      border="neutral-strong"
                      radius="xs"
                      onPointerDown={(event) => begin(event, layer, handle)}
                      style={{
                        left: HANDLE_POSITION[handle].left,
                        top: HANDLE_POSITION[handle].top,
                        width: 12,
                        height: 12,
                        transform: "translate(-50%, -50%)",
                        cursor: HANDLE_POSITION[handle].cursor,
                      }}
                    />
                  ))
                : null}
            </Flex>
          );
        })}
      </Flex>
    </Column>
  );
}
