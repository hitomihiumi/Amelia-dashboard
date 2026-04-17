"use client";

import React, { forwardRef } from "react";
import classNames from "classnames";

import { AvatarWFrame, AvatarWFrameProps } from "./AvatarWFrame";
import { Flex, Text, Skeleton, Tag, TagProps, Column } from "@once-ui-system/core";

interface UserProps {
  tag?: string;
  tagProps?: TagProps;
  loading?: boolean;
  avatarProps?: AvatarWFrameProps;
  className?: string;
}

const User = forwardRef<HTMLDivElement, UserProps>(
  ({ tagProps = {}, loading = false, avatarProps = {}, className }, ref) => {
    const { src, value, empty, ...restAvatarProps } = avatarProps;
    const isEmpty = empty || (!src && !value);

    return (
      <Flex ref={ref} vertical="center" gap="8" className={classNames(className)}>
        <AvatarWFrame
          size="m"
          src={src}
          value={value}
          empty={isEmpty}
          loading={loading}
          {...restAvatarProps}
        />
      </Flex>
    );
  },
);

User.displayName = "User";

export { User };
export type { UserProps };
