'use client';

import React, {ReactNode} from "react";
import {Icon, type ColorWeight, type ColorScheme, Flex} from "@once-ui-system/core";
import {IconName} from "@/resources/icons";

export interface DashIconProps extends React.ComponentProps<typeof Flex> {
    name: IconName;
    onBackground?: `${ColorScheme}-${ColorWeight}`;
    onSolid?: `${ColorScheme}-${ColorWeight}`;
    size?: "xs" | "s" | "m" | "l" | "xl";
    decorative?: boolean;
    tooltip?: ReactNode;
    tooltipPosition?: "top" | "bottom" | "left" | "right";
    className?: string;
    style?: React.CSSProperties;
}

export const DashIcon: React.FC<DashIconProps> = ({
    name,
    size = "m",
    decorative = false,
    tooltip,
    tooltipPosition = "top",
    className,
    style,
    ...rest
}) => {
    return (
        <Icon
            name={name}
            size={size}
            decorative={decorative}
            title={tooltip ? String(tooltip) : undefined}
            aria-label={tooltip ? String(tooltip) : undefined}
            data-tooltip-position={tooltipPosition}
            className={className}
            style={{
                borderColor: 'var(--scheme-brand-500)',
                borderWidth: '1px',
                borderStyle: 'solid',
                backgroundColor: 'var(--scheme-brand-500-30)',
                color: 'var(--scheme-brand-600)',
                ...style,
            }}
            padding={'xs'}
            radius={'s'}
            {...rest}
        />
    );
};