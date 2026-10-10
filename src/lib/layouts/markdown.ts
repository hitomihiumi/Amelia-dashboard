/** Small text edits for the markdown toolbar. Pure, so the textarea only has to apply the result. */

export interface TextEdit {
  value: string;
  /** Selection to restore after the edit. */
  start: number;
  end: number;
}

/** Wraps the selection in `marker` (`**` for bold). Applying it again to the same selection removes it. */
export function wrapSelection(
  value: string,
  start: number,
  end: number,
  marker: string,
  fallback: string,
): TextEdit {
  const selected = value.slice(start, end);
  const before = value.slice(0, start);
  const after = value.slice(end);

  // The marker sits right outside the selection: take it off.
  if (before.endsWith(marker) && after.startsWith(marker) && selected) {
    return {
      value: before.slice(0, -marker.length) + selected + after.slice(marker.length),
      start: start - marker.length,
      end: end - marker.length,
    };
  }

  // The selection includes the markers: take them off too.
  if (
    selected.length >= marker.length * 2 &&
    selected.startsWith(marker) &&
    selected.endsWith(marker)
  ) {
    const inner = selected.slice(marker.length, -marker.length);
    return { value: before + inner + after, start, end: start + inner.length };
  }

  const text = selected || fallback;
  return {
    value: `${before}${marker}${text}${marker}${after}`,
    start: start + marker.length,
    end: start + marker.length + text.length,
  };
}

/** Start and end of the lines touched by the selection. */
function lineBounds(value: string, start: number, end: number): { from: number; to: number } {
  const from = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const nextBreak = value.indexOf("\n", end);
  return { from: start === 0 ? 0 : from, to: nextBreak === -1 ? value.length : nextBreak };
}

function editLines(
  value: string,
  start: number,
  end: number,
  edit: (lines: string[]) => string[],
): TextEdit {
  const { from, to } = lineBounds(value, start, end);
  const lines = edit(value.slice(from, to).split("\n"));
  const block = lines.join("\n");
  return { value: value.slice(0, from) + block + value.slice(to), start: from, end: from + block.length };
}

/** Adds `prefix` to every selected line, or removes it when they all have it already. */
export function toggleLinePrefix(value: string, start: number, end: number, prefix: string): TextEdit {
  return editLines(value, start, end, (lines) => {
    const all = lines.every((line) => line.startsWith(prefix));
    return lines.map((line) => (all ? line.slice(prefix.length) : `${prefix}${line}`));
  });
}

/** `# ` becomes `## `, then `### `, then plain text again. */
export function cycleHeading(value: string, start: number, end: number): TextEdit {
  return editLines(value, start, end, (lines) => {
    const level = (line: string) => /^(#{1,3}) /.exec(line)?.[1].length ?? 0;
    const next = (Math.min(...lines.map(level)) + 1) % 4;
    return lines.map((line) => {
      const bare = line.replace(/^#{1,3} /, "");
      return next === 0 ? bare : `${"#".repeat(next)} ${bare}`;
    });
  });
}

export function insertText(value: string, start: number, end: number, text: string): TextEdit {
  const caret = start + text.length;
  return { value: value.slice(0, start) + text + value.slice(end), start: caret, end: caret };
}

/** Inserts `text` and selects the first `select` inside it, so the author can type over an example. */
export function insertTemplate(
  value: string,
  start: number,
  end: number,
  text: string,
  select?: string,
): TextEdit {
  const at = select ? text.indexOf(select) : -1;
  const from = start + (at === -1 ? text.length : at);
  const to = at === -1 ? from : from + (select?.length ?? 0);
  return { value: value.slice(0, start) + text + value.slice(end), start: from, end: to };
}

/**
 * Turns the selection into a `[text](https://)` link and selects the address. With no selection the
 * link text is the example, selected instead.
 */
export function insertLink(value: string, start: number, end: number, sample: string): TextEdit {
  const selected = value.slice(start, end);
  const url = "https://";
  const text = `[${selected || sample}](${url})`;
  const from = start + 1 + (selected || sample).length + 2;
  const next = value.slice(0, start) + text + value.slice(end);
  return selected
    ? { value: next, start: from, end: from + url.length }
    : { value: next, start: start + 1, end: start + 1 + sample.length };
}

/** A fenced code block around the selection. */
export function toggleCodeBlock(value: string, start: number, end: number, sample: string): TextEdit {
  const selected = value.slice(start, end);
  const before = value.slice(0, start);
  const after = value.slice(end);

  if (before.endsWith("```\n") && after.startsWith("\n```") && selected) {
    return {
      value: before.slice(0, -4) + selected + after.slice(4),
      start: start - 4,
      end: end - 4,
    };
  }

  const text = selected || sample;
  const lead = before === "" || before.endsWith("\n") ? "" : "\n";
  const opening = `${lead}\`\`\`\n`;
  return {
    value: `${before}${opening}${text}\n\`\`\`${after}`,
    start: start + opening.length,
    end: start + opening.length + text.length,
  };
}
