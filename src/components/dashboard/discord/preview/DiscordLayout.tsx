"use client";

import type { LayoutCustom, LayoutLibrary } from "@/lib/db/types";

/**
 * Renders a Components V2 layout the way Discord shows it (containers, sections, text,
 * separators, galleries, action rows). The real renderer replaces this placeholder.
 */
export function DiscordLayout({
  layout,
}: {
  layout: LayoutCustom;
  library: LayoutLibrary;
  buttonSize?: "sm" | "md";
}) {
  return (
    <div className="mt-1 text-sm italic text-discord-text-muted" data-layout-placeholder>
      {layout.name}
    </div>
  );
}
