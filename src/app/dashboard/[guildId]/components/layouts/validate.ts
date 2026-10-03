import type { Translator } from "@/i18n/translate";
import { LAYOUT_LIMITS, type LayoutCustom, collectLayoutIssues } from "@/lib/db/types";
import { describeIssue } from "@/lib/layouts/issues";

/** The ids a layout may point at: everything in the state that is being saved. */
export interface SavedLibrary {
  buttons: Array<{ id: string; name?: string; label?: string }>;
  selectMenus: Array<{ id: string; name?: string; placeholder?: string }>;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Cheap structural check, so `collectLayoutIssues` never meets a shape it cannot walk. */
function isWalkable(layout: unknown): layout is LayoutCustom {
  if (!isObject(layout) || !Array.isArray(layout.components)) return false;

  return layout.components.every(
    (component) =>
      isObject(component) &&
      typeof component.type === "string" &&
      (component.type !== "container" ||
        (Array.isArray(component.children) &&
          component.children.every((child) => isObject(child) && typeof child.type === "string"))),
  );
}

/**
 * Validates the layouts of one save and returns translated messages that name the layout
 * and the block at fault. An empty list means they can be stored.
 */
export function validateLayouts(layouts: unknown[], library: SavedLibrary, t: Translator): string[] {
  const errors: string[] = [];

  if (layouts.length > LAYOUT_LIMITS.MAX_LAYOUTS_PER_GUILD) {
    errors.push(t("layouts.errors.tooMany", { max: LAYOUT_LIMITS.MAX_LAYOUTS_PER_GUILD }));
  }

  const seen = new Set<string>();
  // Messages say "Accept" rather than the stored id of the button.
  const nameOf = (id: string) => {
    const button = library.buttons.find((b) => b.id === id);
    if (button) return button.name || button.label || undefined;
    const menu = library.selectMenus.find((m) => m.id === id);
    return menu ? menu.name || menu.placeholder || undefined : undefined;
  };

  layouts.forEach((raw, i) => {
    if (!isObject(raw) || typeof raw.id !== "string" || !raw.id) {
      errors.push(t("layouts.errors.missingId", { n: i + 1 }));
      return;
    }

    if (seen.has(raw.id)) errors.push(t("layouts.errors.duplicateId", { id: raw.id }));
    seen.add(raw.id);

    if (!isWalkable(raw)) {
      errors.push(t("layouts.errors.malformed", { layout: String(raw.name ?? raw.id) }));
      return;
    }

    // Buttons and select menus created in this very save are part of `library` already.
    for (const issue of collectLayoutIssues(raw, library, { knownLater: () => false })) {
      errors.push(describeIssue(t, raw, issue, { nameOf }));
    }
  });

  return errors;
}
