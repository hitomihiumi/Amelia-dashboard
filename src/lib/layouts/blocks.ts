import { generateID } from "@/lib/db/generateID";
import type {
  LayoutActions,
  LayoutComponent,
  LayoutContainer,
  LayoutContainerChild,
  LayoutCustom,
  LayoutGallery,
  LayoutSection,
  LayoutSeparator,
  LayoutText,
} from "@/lib/db/types";

/** Every block of a layout: a top level component or a child of a container. */
export type Block = LayoutComponent;
export type BlockType = Block["type"];

/** What the "Add block" menu offers. `actions` is split by the kind of row it starts as. */
export type BlockKind =
  | "text"
  | "section"
  | "gallery"
  | "separator"
  | "buttons"
  | "select"
  | "container";

export const ROOT = null;
export type ParentId = string | null;

/** Short random id for a block. */
export const newBlockId = (): string => generateID();

// ==================== FACTORIES ====================

export interface BlockSeeds {
  /** Text for a fresh text block. */
  text: string;
  /** Text for a fresh section. */
  sectionText: string;
  /** Media url for a fresh thumbnail or gallery item. `{user.avatar}` always resolves. */
  mediaUrl: string;
}

/** Stored buttons and select menus that are not placed anywhere yet, used to pre-fill rows. */
export interface FreeInteractives {
  buttonId?: string;
  selectMenuId?: string;
}

export function createBlock(
  kind: BlockKind,
  seeds: BlockSeeds,
  free: FreeInteractives = {},
): LayoutContainerChild | LayoutContainer {
  const id = newBlockId();

  switch (kind) {
    case "text":
      return { type: "text", id, content: seeds.text } satisfies LayoutText;
    case "separator":
      return { type: "separator", id, divider: true, spacing: "small" } satisfies LayoutSeparator;
    case "gallery":
      return {
        type: "gallery",
        id,
        items: [{ url: seeds.mediaUrl }],
      } satisfies LayoutGallery;
    case "section":
      return {
        type: "section",
        id,
        texts: [seeds.sectionText],
        accessory: { kind: "thumbnail", url: seeds.mediaUrl },
      } satisfies LayoutSection;
    case "buttons":
      return {
        type: "actions",
        id,
        buttons: free.buttonId ? [free.buttonId] : [],
      } satisfies LayoutActions;
    case "select":
      return {
        type: "actions",
        id,
        buttons: [],
        selectMenuId: free.selectMenuId ?? "",
      } satisfies LayoutActions;
    case "container":
      return { type: "container", id, accentColor: null, spoiler: false, children: [] };
  }
}

export function blockKindOf(block: Block): BlockKind {
  if (block.type === "actions") return actionsMode(block) === "select" ? "select" : "buttons";
  return block.type;
}

/** A row is a select menu row as soon as it has a select menu id, even an empty one. */
export function actionsMode(block: LayoutActions): "buttons" | "select" {
  return typeof block.selectMenuId === "string" ? "select" : "buttons";
}

// ==================== TREE ACCESS ====================

export interface BlockLocation {
  block: Block;
  parentId: ParentId;
  index: number;
  /** `components[1]` / `components[1].children[0]`, the format of `collectLayoutIssues`. */
  path: string;
}

export function findBlock(layout: LayoutCustom, id: string): BlockLocation | null {
  for (let i = 0; i < layout.components.length; i++) {
    const top = layout.components[i];
    if (top.id === id) return { block: top, parentId: ROOT, index: i, path: `components[${i}]` };
    if (top.type === "container") {
      for (let j = 0; j < top.children.length; j++) {
        if (top.children[j].id === id) {
          return {
            block: top.children[j],
            parentId: top.id,
            index: j,
            path: `components[${i}].children[${j}]`,
          };
        }
      }
    }
  }
  return null;
}

/** The blocks that live directly under `parentId` (the root list for `null`). */
export function siblingsOf(layout: LayoutCustom, parentId: ParentId): Block[] {
  if (parentId === ROOT) return layout.components;
  const parent = layout.components.find((c) => c.id === parentId);
  return parent?.type === "container" ? parent.children : [];
}

function withSiblings(layout: LayoutCustom, parentId: ParentId, list: Block[]): LayoutCustom {
  if (parentId === ROOT) return { ...layout, components: list as LayoutComponent[] };
  return {
    ...layout,
    components: layout.components.map((c) =>
      c.id === parentId && c.type === "container"
        ? { ...c, children: list as LayoutContainerChild[] }
        : c,
    ),
  };
}

/** `components[1]` or `components[1].children[0]`, plus whatever follows (`.items[2]`). */
export function parseIssuePath(
  path: string,
): { top: number; child: number | null; rest: string } | null {
  const match = /^components\[(\d+)\](?:\.children\[(\d+)\])?(.*)$/.exec(path);
  if (!match) return null;
  return {
    top: Number(match[1]),
    child: match[2] === undefined ? null : Number(match[2]),
    rest: match[3] ?? "",
  };
}

export function blockAtPath(layout: LayoutCustom, path: string): Block | null {
  const parsed = parseIssuePath(path);
  if (!parsed) return null;
  const top = layout.components[parsed.top];
  if (!top) return null;
  if (parsed.child === null) return top;
  return top.type === "container" ? (top.children[parsed.child] ?? null) : null;
}

// ==================== EDITS (all immutable) ====================

export function updateBlock(layout: LayoutCustom, id: string, next: Block): LayoutCustom {
  const found = findBlock(layout, id);
  if (!found) return layout;
  const list = siblingsOf(layout, found.parentId).slice();
  list[found.index] = next;
  return withSiblings(layout, found.parentId, list);
}

export function removeBlock(layout: LayoutCustom, id: string): LayoutCustom {
  const found = findBlock(layout, id);
  if (!found) return layout;
  return withSiblings(
    layout,
    found.parentId,
    siblingsOf(layout, found.parentId).filter((b) => b.id !== id),
  );
}

export function insertBlock(
  layout: LayoutCustom,
  block: Block,
  parentId: ParentId,
  index?: number,
): LayoutCustom {
  // Containers cannot be nested.
  if (parentId !== ROOT && block.type === "container") return layout;
  const list = siblingsOf(layout, parentId).slice();
  list.splice(index === undefined ? list.length : Math.max(0, Math.min(index, list.length)), 0, block);
  return withSiblings(layout, parentId, list);
}

/** Moves a block one step inside its own list. */
export function moveBlockBy(layout: LayoutCustom, id: string, delta: -1 | 1): LayoutCustom {
  const found = findBlock(layout, id);
  if (!found) return layout;
  const list = siblingsOf(layout, found.parentId).slice();
  const target = found.index + delta;
  if (target < 0 || target >= list.length) return layout;
  [list[found.index], list[target]] = [list[target], list[found.index]];
  return withSiblings(layout, found.parentId, list);
}

/**
 * Moves a block anywhere (drag and drop). `index` counts positions of the target list once the
 * block is taken out of it. Returns the same object when the move is not allowed or changes nothing.
 */
export function moveBlockTo(
  layout: LayoutCustom,
  id: string,
  parentId: ParentId,
  index: number,
): LayoutCustom {
  const found = findBlock(layout, id);
  if (!found) return layout;
  if (parentId === id) return layout;
  if (parentId !== ROOT && found.block.type === "container") return layout;
  if (parentId !== ROOT && !layout.components.some((c) => c.id === parentId && c.type === "container")) {
    return layout;
  }

  const without = removeBlock(layout, id);
  const clamped = Math.max(0, Math.min(index, siblingsOf(without, parentId).length));
  if (found.parentId === parentId && found.index === clamped) return layout;
  return insertBlock(without, found.block, parentId, clamped);
}

/**
 * A deep copy with fresh ids. Buttons and select menus can only be used once per message, so
 * the copy starts without them instead of being instantly invalid.
 */
export function cloneBlock(block: Block, seeds: Pick<BlockSeeds, "mediaUrl">): Block {
  const id = newBlockId();

  switch (block.type) {
    case "text":
      return { ...block, id };
    case "separator":
      return { ...block, id };
    case "gallery":
      return { ...block, id, items: block.items.map((item) => ({ ...item })) };
    case "section":
      return {
        ...block,
        id,
        texts: [...block.texts],
        accessory:
          block.accessory.kind === "button"
            ? { kind: "thumbnail", url: seeds.mediaUrl }
            : { ...block.accessory },
      };
    case "actions":
      return typeof block.selectMenuId === "string"
        ? { ...block, id, buttons: [], selectMenuId: "" }
        : { ...block, id, buttons: [], selectMenuId: undefined };
    case "container":
      return {
        ...block,
        id,
        children: block.children.map((child) => cloneBlock(child, seeds) as LayoutContainerChild),
      };
  }
}

export function duplicateBlock(
  layout: LayoutCustom,
  id: string,
  seeds: Pick<BlockSeeds, "mediaUrl">,
): { layout: LayoutCustom; newId: string | null } {
  const found = findBlock(layout, id);
  if (!found) return { layout, newId: null };
  const copy = cloneBlock(found.block, seeds);
  return { layout: insertBlock(layout, copy, found.parentId, found.index + 1), newId: copy.id };
}

// ==================== QUERIES ====================

export function forEachBlock(layout: LayoutCustom, visit: (block: Block, parentId: ParentId) => void) {
  for (const top of layout.components) {
    visit(top, ROOT);
    if (top.type === "container") for (const child of top.children) visit(child, top.id);
  }
}

/** Stored buttons and select menus already placed somewhere in the layout. */
export function usedInteractives(
  layout: LayoutCustom,
  exceptBlockId?: string,
): { buttons: Set<string>; selectMenus: Set<string> } {
  const buttons = new Set<string>();
  const selectMenus = new Set<string>();

  forEachBlock(layout, (block) => {
    if (block.id === exceptBlockId) return;
    if (block.type === "actions") {
      for (const id of block.buttons) buttons.add(id);
      if (block.selectMenuId) selectMenus.add(block.selectMenuId);
    } else if (block.type === "section" && block.accessory.kind === "button") {
      if (block.accessory.buttonId) buttons.add(block.accessory.buttonId);
    }
  });

  return { buttons, selectMenus };
}

/** Whether `ancestorId` is a container that holds `id`. */
export function isInside(layout: LayoutCustom, id: string, ancestorId: string): boolean {
  const container = layout.components.find((c) => c.id === ancestorId);
  return container?.type === "container" && container.children.some((child) => child.id === id);
}

/** A copy of a whole layout with fresh ids everywhere. Unlike a duplicated block it keeps its buttons: it is another message. */
export function copyLayout(layout: LayoutCustom, id: string, name: string): LayoutCustom {
  const fresh = <T extends LayoutComponent>(block: T): T => {
    const copy = JSON.parse(JSON.stringify(block)) as T;
    copy.id = newBlockId();
    if (copy.type === "container") {
      for (const child of copy.children) child.id = newBlockId();
    }
    return copy;
  };
  return { id, name, components: layout.components.map((block) => fresh(block)) };
}
