"use client";

import type { ButtonCustom, SelectMenuCustom } from "@/lib/db/types";
import {
  type Block,
  type BlockKind,
  type BlockSeeds,
  type ParentId,
} from "@/lib/layouts/blocks";
import { createContext, useContext } from "react";

/** The stored buttons and select menus a layout can point at. */
export interface EditorLibrary {
  buttons: ButtonCustom[];
  selectMenus: SelectMenuCustom[];
}

/** Everything the blocks can do to the layout. The object never changes, so it never causes a re-render. */
export interface EditorActions {
  update: (id: string, next: Block) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => void;
  move: (id: string, delta: -1 | 1) => void;
  add: (kind: BlockKind, parentId: ParentId) => void;
  toggleCollapse: (id: string) => void;
  select: (id: string) => void;
  /** Opens another tab of the manager, e.g. the Buttons tab when there is nothing to pick yet. */
  gotoTab?: (tab: "buttons" | "selectMenus") => void;
  dragStart: (id: string, card: HTMLElement | null, event: React.DragEvent) => void;
  dragEnd: () => void;
  /** Called while dragging over a card or the end of a list. */
  dragOverCard: (
    event: React.DragEvent,
    target: { id: string; parentId: ParentId; visibleIndex: number },
  ) => void;
  dragOverEnd: (event: React.DragEvent, target: { parentId: ParentId; visibleCount: number }) => void;
}

export interface DropTarget {
  parentId: ParentId;
  /** Position in the target list once the dragged block is taken out of it. */
  index: number;
}

/** The parts of the editor state that blocks render from. Changes rarely, not on every keystroke. */
export interface EditorEnv {
  library: EditorLibrary;
  used: { buttons: Set<string>; selectMenus: Set<string> };
  seeds: BlockSeeds;
  collapsed: ReadonlySet<string>;
  selectedId: string | null;
  dragId: string | null;
  /** The block being dragged is a container, which can only live at the top level. */
  dragContainer: boolean;
  drop: DropTarget | null;
}

export const EditorActionsContext = createContext<EditorActions | null>(null);
export const EditorEnvContext = createContext<EditorEnv | null>(null);

export function useEditorActions(): EditorActions {
  const value = useContext(EditorActionsContext);
  if (!value) throw new Error("Layout editor blocks must be rendered inside <LayoutEditor>");
  return value;
}

export function useEditorEnv(): EditorEnv {
  const value = useContext(EditorEnvContext);
  if (!value) throw new Error("Layout editor blocks must be rendered inside <LayoutEditor>");
  return value;
}

export const blockDomId = (id: string) => `layout-block-${id}`;
