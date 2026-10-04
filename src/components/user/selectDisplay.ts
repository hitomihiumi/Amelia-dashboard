import { createContext, isValidElement, type ReactNode, useContext } from "react";

/**
 * How a pill is rendered. Inside a select the surrounding row, chip or field
 * already provides the background, so pills drop their own badge styling.
 */
export type SelectDisplay = "pill" | "plain";

export const SelectDisplayContext = createContext<SelectDisplay>("pill");

export function useSelectDisplay(): SelectDisplay {
  return useContext(SelectDisplayContext);
}

/**
 * Plain text of an option label, used for searching.
 *
 * Option labels are React nodes — usually a `ChannelPill` or a `RolePill` — so
 * `label.toString()` would give "[object Object]". Elements can expose their
 * text through a string `label`, a `channel.name`, or their children.
 */
export function nodeText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join(" ");

  if (isValidElement(node)) {
    const props = node.props as {
      label?: unknown;
      channel?: { name?: unknown };
      children?: ReactNode;
    };

    if (typeof props.label === "string" && props.label) return props.label;
    if (typeof props.channel?.name === "string") return props.channel.name;
    return nodeText(props.children);
  }

  return "";
}
