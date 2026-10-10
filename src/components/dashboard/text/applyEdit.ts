import type { TextEdit } from "@/lib/layouts/markdown";

export type EditFn = (value: string, start: number, end: number) => TextEdit;

/** Applies a text edit to whatever field the toolbar belongs to. */
export type ApplyEdit = (edit: EditFn) => void;

/**
 * Runs `edit` on the text field `id` (an `Input` or `Textarea` carrying that id) at its selection,
 * reports the new value and puts the selection back. An edit that would grow the text past the
 * field's own `maxLength` is dropped, the same way typing would be.
 */
export function applyToField(
  id: string,
  current: string,
  onValue: (value: string) => void,
  edit: EditFn,
) {
  const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
  const value = el?.value ?? current;
  const start = el?.selectionStart ?? value.length;
  const end = el?.selectionEnd ?? start;
  const next = edit(value, start, end);

  const max = el && el.maxLength > 0 ? el.maxLength : null;
  if (max !== null && next.value.length > max && next.value.length > value.length) return;

  onValue(next.value);
  requestAnimationFrame(() => {
    if (!el) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(next.start, next.end);
  });
}
