import type { MessageKey } from "@/i18n/messages/types";
import type { Translator } from "@/i18n/translate";
import type { LayoutCustom, LayoutIssue, LayoutIssueCode } from "@/lib/db/types";
import { type Block, blockAtPath, parseIssuePath } from "./blocks";

/** Layout wide problems (name, empty layout, budgets) plus the problems of each block, by block id. */
export interface GroupedIssues {
  layout: LayoutIssue[];
  byBlock: Map<string, LayoutIssue[]>;
}

export const NO_ISSUES: readonly LayoutIssue[] = Object.freeze([]);

export function groupIssues(layout: LayoutCustom, issues: LayoutIssue[]): GroupedIssues {
  const grouped: GroupedIssues = { layout: [], byBlock: new Map() };

  for (const issue of issues) {
    const block = blockAtPath(layout, issue.path);
    if (!block) {
      grouped.layout.push(issue);
      continue;
    }
    const list = grouped.byBlock.get(block.id);
    if (list) list.push(issue);
    else grouped.byBlock.set(block.id, [issue]);
  }

  return grouped;
}

/** What follows the block in an issue path, e.g. `.items[2]` or `.texts[0]` or `.accessory`. */
export function issueSubPath(issue: LayoutIssue): string {
  return parseIssuePath(issue.path)?.rest ?? "";
}

export interface IssueContext {
  /** Display name of a stored button or select menu, so a message can name it instead of showing an id. */
  nameOf?: (id: string) => string | undefined;
}

const ISSUE_KEYS: Record<LayoutIssueCode, MessageKey> = {
  nameLength: "layouts.issues.nameLength",
  empty: "layouts.issues.empty",
  tooManyComponents: "layouts.issues.tooManyComponents",
  textTooLong: "layouts.issues.textTooLong",
  textEmpty: "layouts.issues.textEmpty",
  galleryEmpty: "layouts.issues.galleryEmpty",
  galleryTooMany: "layouts.issues.galleryTooMany",
  mediaUrlInvalid: "layouts.issues.mediaUrlInvalid",
  descriptionTooLong: "layouts.issues.descriptionTooLong",
  sectionTexts: "layouts.issues.sectionTexts",
  sectionAccessoryMissing: "layouts.issues.sectionAccessoryMissing",
  buttonMissing: "layouts.issues.buttonMissing",
  selectMenuMissing: "layouts.issues.selectMenuMissing",
  duplicateInteractive: "layouts.issues.duplicateInteractive",
  rowEmpty: "layouts.issues.rowEmpty",
  rowMixed: "layouts.issues.rowMixed",
  rowTooManyButtons: "layouts.issues.rowTooManyButtons",
  accentColorInvalid: "layouts.issues.accentColorInvalid",
  duplicateId: "layouts.issues.duplicateId",
  unknownType: "layouts.issues.unknownType",
};

/** Translates one issue code. `layout` is needed to tell an empty layout from an empty container. */
export function formatIssue(t: Translator, issue: LayoutIssue, context: IssueContext = {}): string {
  const params: Record<string, string | number> = { ...(issue.params ?? {}) };

  if (typeof params.id === "string") {
    params.name = context.nameOf?.(params.id) ?? params.id;
  }

  if (issue.code === "empty" && issue.path !== "components") {
    return t("layouts.issues.emptyContainer", params);
  }

  return t(ISSUE_KEYS[issue.code], params);
}

const TYPE_LABEL_KEYS: Record<Block["type"], MessageKey> = {
  text: "layouts.blocks.text.label",
  section: "layouts.blocks.section.label",
  gallery: "layouts.blocks.gallery.label",
  separator: "layouts.blocks.separator.label",
  actions: "layouts.blocks.actions.label",
  container: "layouts.blocks.container.label",
};

export function blockTypeLabel(t: Translator, type: Block["type"]): string {
  return t(TYPE_LABEL_KEYS[type] ?? "layouts.blocks.unknown");
}

/** "block 2 (Container) › block 1 (Text)", for messages that must point at the offending block. */
export function describeBlockPath(t: Translator, layout: LayoutCustom, path: string): string | null {
  const parsed = parseIssuePath(path);
  if (!parsed) return null;

  const top = layout.components[parsed.top];
  if (!top) return null;
  const topType = typeof top.type === "string" ? top.type : ("text" as const);

  if (parsed.child === null) {
    return t("layouts.blockRef.top", { n: parsed.top + 1, type: blockTypeLabel(t, topType) });
  }

  const child = top.type === "container" ? top.children[parsed.child] : undefined;
  return t("layouts.blockRef.child", {
    n: parsed.top + 1,
    type: blockTypeLabel(t, topType),
    m: parsed.child + 1,
    childType: blockTypeLabel(t, child && typeof child.type === "string" ? child.type : "text"),
  });
}

/** Full sentence for the save error: names the layout and the block. */
export function describeIssue(
  t: Translator,
  layout: LayoutCustom,
  issue: LayoutIssue,
  context: IssueContext = {},
): string {
  const message = formatIssue(t, issue, context);
  const block = describeBlockPath(t, layout, issue.path);
  const name = typeof layout.name === "string" && layout.name.trim() ? layout.name.trim() : layout.id;

  return block
    ? t("layouts.errors.blockIssue", { layout: name, block, message })
    : t("layouts.errors.layoutIssue", { layout: name, message });
}
