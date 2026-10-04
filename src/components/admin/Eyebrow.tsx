import React, { type CSSProperties, type ReactNode } from "react";
import { Text } from "@once-ui-system/core";

/** Small uppercase caption above a group of rows or fields. */
export function Eyebrow({
  as = "span",
  htmlFor,
  children,
  style,
  className,
  id,
  paddingX,
}: {
  as?: "span" | "h2" | "h3" | "h4" | "p" | "label";
  /** Only for `as="label"`. */
  htmlFor?: string;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  id?: string;
  paddingX?: "4" | "8" | "12" | "16";
}) {
  return (
    <Text
      as={as}
      id={id}
      variant="label-strong-xs"
      onBackground="neutral-weak"
      paddingX={paddingX}
      className={className}
      style={{ textTransform: "uppercase", letterSpacing: "0.06em", ...style }}
      {...(htmlFor ? { htmlFor } : {})}
    >
      {children}
    </Text>
  );
}
