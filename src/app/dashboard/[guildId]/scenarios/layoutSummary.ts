import {
  type LayoutCustom,
  type LayoutContainerChild,
  collectLayoutIssues,
  countLayoutComponents,
} from "@/lib/db/types";

export interface LayoutSummary {
  /** Components as Discord counts them against its cap of 40. */
  components: number;
  buttons: number;
  menus: number;
  /** Gallery items and section thumbnails. */
  images: number;
  /** First line of text found, for a quick "is this the right one" glance. */
  excerpt: string | null;
}

const EXCERPT_LENGTH = 90;

function eachChild(layout: LayoutCustom, visit: (child: LayoutContainerChild) => void) {
  for (const component of layout.components ?? []) {
    if (component.type === "container") component.children?.forEach(visit);
    else visit(component);
  }
}

/** Small, render-friendly facts about a layout, shown next to the layout picker. */
export function summarizeLayout(layout: LayoutCustom): LayoutSummary {
  let buttons = 0;
  let menus = 0;
  let images = 0;
  let excerpt: string | null = null;

  const takeText = (text: unknown) => {
    if (excerpt || typeof text !== "string") return;
    const line = text
      .split("\n")
      .map((part) => part.replace(/^[#>*\-\s]+/, "").trim())
      .find(Boolean);
    if (!line) return;
    excerpt = line.length > EXCERPT_LENGTH ? `${line.slice(0, EXCERPT_LENGTH - 1)}…` : line;
  };

  eachChild(layout, (child) => {
    switch (child.type) {
      case "text":
        takeText(child.content);
        break;
      case "gallery":
        images += child.items?.length ?? 0;
        break;
      case "section":
        takeText(child.texts?.[0]);
        if (child.accessory?.kind === "thumbnail") images += 1;
        if (child.accessory?.kind === "button") buttons += 1;
        break;
      case "actions":
        buttons += child.buttons?.length ?? 0;
        if (child.selectMenuId) menus += 1;
        break;
    }
  });

  return { components: countLayoutComponents(layout), buttons, menus, images, excerpt };
}

export interface LayoutReferenceProblems {
  /** Buttons or select menus the layout points at that no longer exist. */
  missingRefs: number;
  /** Everything else `collectLayoutIssues` reports (empty layout, bad media URL, limits ...). */
  other: number;
}

/** Splits the shared validator's findings into "dangling references" and "other problems". */
export function layoutReferenceProblems(
  layout: LayoutCustom,
  library: { buttons: Array<{ id: string }>; selectMenus: Array<{ id: string }> },
): LayoutReferenceProblems {
  const issues = collectLayoutIssues(layout, {
    buttons: library.buttons,
    selectMenus: library.selectMenus,
  });
  const missingRefs = issues.filter(
    (issue) => issue.code === "buttonMissing" || issue.code === "selectMenuMissing",
  ).length;
  return { missingRefs, other: issues.length - missingRefs };
}
