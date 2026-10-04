"use client";

import React, { useState, useEffect, forwardRef, useCallback, ReactNode } from "react";
import classNames from "classnames";
import { Column, Row, Text, useDebounce } from "@once-ui-system/core";
import type { InputProps as OnceInputProps } from "@once-ui-system/core";
import styles from "./DummyInput.module.scss";

interface InputProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "content" | "prefix"> {
  id: string;
  label?: string;
  placeholder?: string;
  size?: OnceInputProps["size"];
  error?: boolean;
  errorMessage?: ReactNode;
  description?: ReactNode;
  corners?: OnceInputProps["corners"];
  className?: string;
  style?: React.CSSProperties;
  prefix?: ReactNode;
  suffix?: ReactNode;
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
      size = "m",
      error = false,
      errorMessage,
      description,
      corners,
      className,
      style,
      prefix,
      suffix,
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
      styles.content,
      "font-body",
      "font-default",
      cursor === "interactive" ? "cursor-interactive" : undefined,
      {
        [styles.withPrefix]: prefix,
        [styles.withSuffix]: suffix,
        [styles.hasChildren]: Boolean(content),
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
          data-surface="field"
          transition="micro-medium"
          border="neutral-medium"
          background="neutral-alpha-weak"
          overflow="hidden"
          vertical="stretch"
          className={classNames(
            styles.base,
            styles[size],
            corners === "none" ? "radius-none" : corners ? `radius-l-${corners}` : "radius-l",
          )}
        >
          {prefix && (
            <Row paddingLeft="12" className={styles.prefix} position="static">
              {prefix}
            </Row>
          )}
          <Column fillWidth padding="4">
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
          {suffix && (
            <Row paddingRight="12" className={styles.suffix} position="static">
              {suffix}
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
