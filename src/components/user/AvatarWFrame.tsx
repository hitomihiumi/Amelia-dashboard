"use client";

import React, { forwardRef } from "react";

import { Skeleton, Icon, Text, StatusIndicator, Flex, Media } from "@once-ui-system/core";
import styles from "./AvatarWFrame.module.scss";

interface AvatarWFrameProps extends React.ComponentProps<typeof Flex> {
  size?: "xs" | "s" | "m" | "l" | "xl";
  value?: string;
  src?: string;
  frame?: string | null;
  loading?: boolean;
  empty?: boolean;
  statusIndicator?: {
    color: "green" | "yellow" | "red" | "gray";
  };
  style?: React.CSSProperties;
  className?: string;
}

const sizeMapping: Record<"xs" | "s" | "m" | "l" | "xl", number> = {
  xs: 20,
  s: 24,
  m: 32,
  l: 48,
  xl: 160,
};

const statusIndicatorSizeMapping: Record<"xs" | "s" | "m" | "l" | "xl", "s" | "m" | "l"> = {
  xs: "s",
  s: "s",
  m: "m",
  l: "m",
  xl: "l",
};

const AvatarWFrame = forwardRef<HTMLDivElement, AvatarWFrameProps>(
  (
    { size = "m", value, src, frame, loading, empty, statusIndicator, className, style, ...rest },
    ref,
  ) => {
    const isEmpty = empty || (!src && !value);

    if (value && src) {
      throw new Error("Avatar cannot have both 'value' and 'src' props.");
    }

    if (loading) {
      return (
        <Skeleton
          {...rest}
          style={{
            border: "1px solid var(--neutral-border-medium)",
          }}
          shape="circle"
          width={size}
          height={size}
          className={`${styles.avatar} ${className}`}
          aria-busy="true"
          aria-label="Loading avatar"
        />
      );
    }

    const renderContent = () => {
      if (isEmpty) {
        return (
          <Icon
            onBackground="neutral-medium"
            name="person"
            size={size as "xs" | "s" | "m" | "l" | "xl"}
            className={styles.icon}
            aria-label="Empty avatar"
          />
        );
      }

      if (src) {
        return (
          <>
            <Media
              src={src}
              alt="Avatar"
              fill
              maxWidth={"160"}
              maxHeight={"160"}
              sizes={`${sizeMapping[size]}px`}
              className={styles.image}
              //@ts-ignore
              aspectRatio={"1/1"}
              pointerEvents={"none"}
              {...rest}
            />
            {frame && (
              <Media
                src={frame}
                fill
                alt="Frame"
                sizes={`${styles[size]}px`}
                position={"absolute"}
                className={styles.frame}
                aspectRatio={"1/1"}
                pointerEvents={"none"}
              />
            )}
          </>
        );
      }

      if (value) {
        return (
          <Text
            as="span"
            onBackground="neutral-weak"
            variant={`body-default-${size}`}
            className={styles.value}
            aria-label={`Avatar with initials ${value}`}
          >
            {value}
          </Text>
        );
      }

      return null;
    };

    return (
      <Flex
        ref={ref}
        role="img"
        position="relative"
        horizontal="center"
        vertical="center"
        style={style}
        className={`${styles.avatar} ${styles[size]} ${className || ""}`}
      >
        {renderContent()}
        {statusIndicator && (
          <StatusIndicator
            size={statusIndicatorSizeMapping[size]}
            color={statusIndicator.color}
            className={`${styles.className || ""} ${styles.indicator} ${size === "xl" ? styles.position : ""}`}
            aria-label={`Status: ${statusIndicator.color}`}
          />
        )}
      </Flex>
    );
  },
);

AvatarWFrame.displayName = "Avatar";

export { AvatarWFrame };
export type { AvatarWFrameProps };
