"use client";

import type { PreviewTagContext } from "@/lib/discord/preview-tags";
import { createContext, useContext, type ReactNode } from "react";

/** Everything the Discord preview needs to render with real identities:
 * the bot's name/avatar plus the current guild's name/icon for tag substitution. */
export type DiscordPreviewContextValue = PreviewTagContext & {
  botName: string;
  botAvatarUrl: string | null;
};

const DiscordPreviewContext = createContext<DiscordPreviewContextValue | null>(null);

export function DiscordPreviewProvider({
  value,
  children,
}: {
  value: DiscordPreviewContextValue;
  children: ReactNode;
}) {
  return <DiscordPreviewContext.Provider value={value}>{children}</DiscordPreviewContext.Provider>;
}

/** Null outside a guild dashboard (e.g. isolated renders) — callers fall back to defaults. */
export function useDiscordPreviewOptional(): DiscordPreviewContextValue | null {
  return useContext(DiscordPreviewContext);
}
