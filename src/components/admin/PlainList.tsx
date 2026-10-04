import React, { type ComponentProps } from "react";
import { Column, Row } from "@once-ui-system/core";

/**
 * A list without bullets or indent: a `ul` made of the layout primitives. Flex rows are not
 * `list-item`s, so no marker is drawn; the element keeps the list semantics.
 */
export function PlainList({
  children,
  ...rest
}: ComponentProps<typeof Column>) {
  return (
    <Column as="ul" fillWidth margin="0" padding="0" {...rest}>
      {children}
    </Column>
  );
}

export function PlainItem({ children, ...rest }: ComponentProps<typeof Row>) {
  return (
    <Row as="li" {...rest}>
      {children}
    </Row>
  );
}
