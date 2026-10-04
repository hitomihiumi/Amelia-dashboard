import type { ChainedCommands } from "@tiptap/core";
import type { IconType } from "react-icons";
import {
  LuHeading1,
  LuHeading2,
  LuHeading3,
  LuImage,
  LuList,
  LuListOrdered,
  LuMinus,
  LuPilcrow,
  LuQuote,
  LuSquareCode,
  LuTable,
} from "react-icons/lu";

export type SlashId =
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "bulletList"
  | "orderedList"
  | "quote"
  | "codeBlock"
  | "divider"
  | "table"
  | "image";

export interface SlashItem {
  id: SlashId;
  icon: IconType;
  /** Extra English words the query can match, next to the translated title. */
  keywords: string[];
  /** Applies the block on a chain that has already deleted the "/query" text. */
  run: (chain: ChainedCommands) => ChainedCommands;
}

export const SLASH_ITEMS: SlashItem[] = [
  { id: "paragraph", icon: LuPilcrow, keywords: ["text", "paragraph", "p"], run: (c) => c.setParagraph() },
  { id: "heading1", icon: LuHeading1, keywords: ["h1", "title", "heading"], run: (c) => c.setHeading({ level: 1 }) },
  { id: "heading2", icon: LuHeading2, keywords: ["h2", "heading", "subtitle"], run: (c) => c.setHeading({ level: 2 }) },
  { id: "heading3", icon: LuHeading3, keywords: ["h3", "heading"], run: (c) => c.setHeading({ level: 3 }) },
  { id: "bulletList", icon: LuList, keywords: ["ul", "bullet", "list", "unordered"], run: (c) => c.toggleBulletList() },
  { id: "orderedList", icon: LuListOrdered, keywords: ["ol", "number", "list", "ordered"], run: (c) => c.toggleOrderedList() },
  { id: "quote", icon: LuQuote, keywords: ["blockquote", "quote", "citation"], run: (c) => c.toggleBlockquote() },
  { id: "codeBlock", icon: LuSquareCode, keywords: ["code", "pre", "snippet"], run: (c) => c.toggleCodeBlock() },
  { id: "divider", icon: LuMinus, keywords: ["hr", "rule", "line", "divider", "separator"], run: (c) => c.setHorizontalRule() },
  {
    id: "table",
    icon: LuTable,
    keywords: ["table", "grid"],
    run: (c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true }),
  },
  // The address is typed into the toolbar popover, so nothing is applied here.
  { id: "image", icon: LuImage, keywords: ["image", "img", "picture", "photo"], run: (c) => c },
];

/** Image address on its own, e.g. pasted from the browser's "copy image address". */
export const IMAGE_URL = /^https?:\/\/\S+\.(?:png|jpe?g|gif|webp|svg|avif)(?:\?\S*)?(?:#\S*)?$/i;
