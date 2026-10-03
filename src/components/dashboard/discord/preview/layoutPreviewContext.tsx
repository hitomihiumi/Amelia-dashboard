"use client";

import { createContext, useContext } from "react";

/**
 * Lets the layout editor and the Discord preview talk to each other without threading props
 * through `DiscordPreview`: clicking a block in the preview selects it in the editor, and the
 * block selected in the editor is outlined in the preview.
 */
export interface LayoutPreviewSelection {
  selectedId: string | null;
  onSelect: (blockId: string) => void;
}

const LayoutPreviewSelectionContext = createContext<LayoutPreviewSelection | null>(null);

export const LayoutPreviewSelectionProvider = LayoutPreviewSelectionContext.Provider;

/** Null when the preview is not driven by an editor (scenario previews, for instance). */
export function useLayoutPreviewSelection(): LayoutPreviewSelection | null {
  return useContext(LayoutPreviewSelectionContext);
}
