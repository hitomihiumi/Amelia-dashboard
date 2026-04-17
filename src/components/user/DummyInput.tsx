"use client";

import React, { useState, useEffect, forwardRef, useCallback, ReactNode } from "react";
import classNames from "classnames";
import { Column, Row, Text, useDebounce } from "@once-ui-system/core";
import styles from "./DummyInput.module.scss";

interface InputProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "content"> {
  id: string;
  label?: string;
  placeholder?: string;
  height?: "s" | "m";
  error?: boolean;
  errorMessage?: ReactNode;
  description?: ReactNode;
  radius?:
    | "none"
    | "top"
    | "right"
    | "bottom"
    | "left"
    | "top-left"
    | "top-right"
    | "bottom-right"
    | "bottom-left";
  className?: string;
  style?: React.CSSProperties;
  hasPrefix?: ReactNode;
  hasSuffix?: ReactNode;
  characterCount?: boolean;
  cursor?: undefined | "interactive";
  validate?: (value: ReactNode) => ReactNode | null;
  content?: ReactNode;
  children?: never;
}

const DummyInput = forwardRef<HTMLDivElement, InputProps>(
  (
    {
      id,
      label,
      placeholder,
      height = "m",
      error = false,
      errorMessage,
      description,
      radius,
      className,
      style,
      hasPrefix,
      hasSuffix,
      characterCount,
      content,
      onFocus,
      onBlur,
      validate,
      cursor,
      ...props
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isFilled, setIsFilled] = useState(!!content);
    const [validationError, setValidationError] = useState<ReactNode | null>(null);
    const debouncedValue = useDebounce(content, 1000);

    const handleFocus = () => {
      setIsFocused(true);
      if (onFocus) onFocus({} as React.FocusEvent<HTMLDivElement>);
    };

    const handleBlur = () => {
      setIsFocused(false);
      if (content) {
        setIsFilled(true);
      } else {
        setIsFilled(false);
      }
      if (onBlur) onBlur({} as React.FocusEvent<HTMLDivElement>);
    };

    useEffect(() => {
      setIsFilled(!!content);
    }, [content]);

    const validateInput = useCallback(() => {
      if (!debouncedValue) {
        setValidationError(null);
        return;
      }

      if (validate) {
        const error = validate(debouncedValue);
        if (error) {
          setValidationError(error);
        } else {
          setValidationError(errorMessage || null);
        }
      } else {
        setValidationError(null);
      }
    }, [debouncedValue, validate, errorMessage]);

    useEffect(() => {
      validateInput();
    }, [debouncedValue, validateInput]);

    const displayError = validationError || errorMessage;

    const inputClassNames = classNames(
      styles.input,
      "font-body",
      "font-default",
      "font-m",
      cursor === "interactive" ? "cursor-interactive" : undefined,
      {
        [styles.filled]: isFilled,
        [styles.focused]: isFocused,
        [styles.withPrefix]: hasPrefix,
        [styles.withSuffix]: hasSuffix,
        [styles.placeholder]: placeholder,
        [styles.hasChildren]: content,
        [styles.error]: displayError && debouncedValue !== "",
      },
    );

    return (
      <Column
        gap="8"
        style={style}
        fillWidth
        fitHeight
        className={classNames(className, {
          [styles.error]: (error || (displayError && debouncedValue !== "")) && content !== "",
        })}
      >
        <Row
          transition="micro-medium"
          border="neutral-medium"
          background="neutral-alpha-weak"
          overflow="hidden"
          vertical="stretch"
          className={classNames(
            styles.base,
            {
              [styles.s]: height === "s",
            },
            {
              [styles.m]: height === "m",
            },
            radius === "none" ? "radius-none" : radius ? `radius-l-${radius}` : "radius-l",
          )}
        >
          {hasPrefix && (
            <Row paddingLeft="12" className={styles.prefix} position="static">
              {hasPrefix}
            </Row>
          )}
          <Column fillWidth>
            <div
              ref={ref}
              id={id}
              onFocus={handleFocus}
              onBlur={handleBlur}
              className={inputClassNames}
              aria-describedby={displayError ? `${id}-error` : undefined}
              aria-invalid={!!displayError}
              tabIndex={0}
              {...props}
            >
              {content}
            </div>
            {label && (
              <Text
                as="label"
                variant="label-default-m"
                htmlFor={id}
                className={classNames(styles.label, styles.inputLabel, {
                  [styles.floating]: isFocused || isFilled || placeholder,
                })}
              >
                {label}
              </Text>
            )}
          </Column>
          {hasSuffix && (
            <Row paddingRight="12" className={styles.suffix} position="static">
              {hasSuffix}
            </Row>
          )}
        </Row>
        {displayError && errorMessage !== false && (
          <Row
            paddingX="16"
            id={`${id}-error`}
            textVariant="body-default-s"
            onBackground="danger-weak"
          >
            {validationError || errorMessage}
          </Row>
        )}
        {description && (
          <Row
            paddingX="16"
            id={`${id}-description`}
            textVariant="body-default-s"
            onBackground="neutral-weak"
          >
            {description}
          </Row>
        )}
      </Column>
    );
  },
);

DummyInput.displayName = "DummyInput";

export { DummyInput };
export type { InputProps };
