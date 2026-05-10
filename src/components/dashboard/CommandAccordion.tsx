"use client";

import React, { useState, forwardRef, useImperativeHandle, useEffect, useCallback } from "react";
import { Flex, Icon, Text, Column, Grid, Row } from "@once-ui-system/core";
import styles from "./CommandAccordion.module.scss";
import classNames from "classnames";
import {IconName} from "@/resources/icons";

export interface AccordionHandle extends HTMLDivElement {
  toggle: () => void;
  open: () => void;
  close: () => void;
}

interface CommandAccordionProps extends Omit<React.ComponentProps<typeof Flex>, "title"> {
  title: React.ReactNode;
  subline: React.ReactNode;
  children: React.ReactNode;
  icon?: string;
  iconName?: IconName;
  iconRotation?: number;
  size?: "s" | "m" | "l";
  radius?: "xs" | "s" | "m" | "l" | "xl" | "full";
  open?: boolean;
  onToggle?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const CommandAccordion = forwardRef<AccordionHandle, CommandAccordionProps>(
  (
    {
      title,
      subline,
      children,
      open = false,
      onToggle,
      iconRotation = 180,
      radius = "m",
      icon = "chevronDown",
      iconName = "gear",
      size = "m",
      className,
      style,
      ...rest
    },
    ref,
  ) => {
    const [isOpen, setIsOpen] = useState(open);

    useEffect(() => {
      setIsOpen(open);
    }, [open]);

    // Use controlled state when onToggle is provided, otherwise use internal state
    const isAccordionOpen = onToggle ? open : isOpen;

    const toggleAccordion = useCallback(() => {
      if (onToggle) {
        // If onToggle is provided, let the parent control the state
        onToggle();
      } else {
        // Otherwise, manage state internally
        setIsOpen((prev) => !prev);
      }
    }, [onToggle]);

    useImperativeHandle(
      ref,
      () => {
        const methods = {
          toggle: toggleAccordion,
          open: () => setIsOpen(true),
          close: () => setIsOpen(false),
        };

        return Object.assign(document.createElement("div"), methods) as unknown as AccordionHandle;
      },
      [toggleAccordion],
    );

    return (
      <Column fillWidth background="surface" radius={radius} overflow={"hidden"}>
        <Row
          tabIndex={0}
          className={classNames(styles.accordion, className)}
          style={style}
          cursor="interactive"
          transition="macro-medium"
          paddingY={size === "s" ? "8" : size === "m" ? "12" : "16"}
          paddingX={size === "s" ? "12" : size === "m" ? "16" : "20"}
          vertical="center"
          horizontal="between"
          onClick={toggleAccordion}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              toggleAccordion();
            }
          }}
          aria-expanded={isAccordionOpen}
          aria-controls="accordion-content"
          radius={radius}
          role="button"
        >
          <Row center gap={"16"}>
            <Flex
              background={"neutral-alpha-weak"}
              padding={"8"}
              radius={
                radius === "xl"
                  ? "l"
                  : radius === "l"
                    ? "m"
                    : radius === "m"
                      ? "s"
                      : radius === "s"
                        ? "none-4"
                        : "xs"
              }
            >
              <Icon name={iconName} size={size === "s" ? "xs" : "s"} onBackground={"brand-strong"} />
            </Flex>
            <Column center>
              <Row fillWidth textVariant="body-strong-s">
                {title}
              </Row>
              <Row fillWidth textVariant="body-default-s" onBackground={"neutral-weak"}>
                {subline}
              </Row>
            </Column>
          </Row>
          <Icon
            name={icon}
            size={size === "s" ? "xs" : "s"}
            onBackground={isAccordionOpen ? "neutral-strong" : "neutral-weak"}
            style={{
              display: "flex",
              transform: isAccordionOpen ? `rotate(${iconRotation}deg)` : "rotate(0deg)",
              transition: "var(--transition-micro-medium)",
            }}
          />
        </Row>
        <Grid
          id="accordion-content"
          fillWidth
          transition="macro-medium"
          style={{
            gridTemplateRows: isAccordionOpen ? "1fr" : "0fr",
          }}
          aria-hidden={!isAccordionOpen}
        >
          <Row fillWidth minHeight={0} overflow="hidden">
            <Column
              fillWidth
              paddingX={size === "s" ? "12" : size === "m" ? "16" : "20"}
              paddingTop="8"
              paddingBottom="16"
              {...rest}
            >
              {children}
            </Column>
          </Row>
        </Grid>
      </Column>
    );
  },
);

CommandAccordion.displayName = "CommandAccordion";
export { CommandAccordion };
