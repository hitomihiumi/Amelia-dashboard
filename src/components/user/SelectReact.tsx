"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  forwardRef,
  ReactNode,
  useId,
} from "react";
import classNames from "classnames";
import {
  DropdownWrapper,
  Flex,
  Icon,
  IconButton,
  Option,
  OptionProps,
  DropdownWrapperProps,
  Column,
  ArrowNavigation,
  useArrowNavigationContext,
  Input,
  InputProps,
  Row,
  Text,
} from "@once-ui-system/core";
import inputStyles from "./DummyInput.module.scss";
import styles from "./SelectReact.module.scss";
import { SelectDisplayContext, nodeText } from "./selectDisplay";

import { DummyInput } from "./DummyInput";

type SelectOptionType = Omit<OptionProps, "selected">;

// Derived from once-ui so this file does not depend on @floating-ui directly.
type Placement = NonNullable<DropdownWrapperProps["placement"]>;

/** Chips shown inside the closed field before the rest collapses into "+N more". */
const MAX_VISIBLE_CHIPS = 10;

/** Saved ids whose channel or role no longer exists should not render as blanks. */
function unknownLabel(value: string): string {
  return /^\d{15,}$/.test(value) ? `Unknown (…${value.slice(-4)})` : value;
}

export interface SelectProps
  extends Omit<InputProps, "onSelect" | "value">,
    Pick<DropdownWrapperProps, "minHeight" | "minWidth" | "maxWidth"> {
  options: SelectOptionType[];
  value?: string | string[];
  emptyState?: ReactNode;
  onSelect?: (value: any) => void;
  placement?: Placement;
  searchable?: boolean;
  className?: string;
  style?: React.CSSProperties;
  fillWidth?: boolean;
  multiple?: boolean;
}

// Inner component that uses the arrow navigation context
const SearchInput: React.FC<{
  searchInputId: string;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setIsDropdownOpen: (open: boolean) => void;
  handleClearSearch: (e: React.MouseEvent) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  selectRef: React.RefObject<HTMLDivElement | null>;
}> = ({
  searchInputId,
  searchQuery,
  setSearchQuery,
  setIsDropdownOpen,
  handleClearSearch,
  handleBlur,
  selectRef,
}) => {
  const { handleKeyDown: navKeyDown } = useArrowNavigationContext();

  return (
    <Input
      data-scaling="90"
      id={`select-search-${searchInputId}`}
      placeholder="Search"
      height="s"
      hasSuffix={
        searchQuery ? (
          <IconButton
            tooltip="Clear"
            tooltipPosition="left"
            icon="close"
            variant="ghost"
            size="s"
            onClick={handleClearSearch}
          />
        ) : undefined
      }
      hasPrefix={<Icon name="search" size="xs" />}
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        setIsDropdownOpen(true);
      }}
      onFocus={(e) => {
        e.stopPropagation();
        setIsDropdownOpen(true);
      }}
      onKeyDown={(e) => {
        // Handle arrow keys and Enter for navigation
        if (["ArrowDown", "ArrowUp", "Enter", "Home", "End"].includes(e.key)) {
          navKeyDown(e as any);
          return;
        }

        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          setIsDropdownOpen(false);
          setSearchQuery("");
          const mainInput = selectRef.current?.querySelector("input:not([id^='select-search'])");
          if (mainInput instanceof HTMLInputElement) {
            mainInput.focus();
          }
        }
      }}
      onBlur={(e) => {
        const relatedTarget = e.relatedTarget as Node;
        const isClickInDropdown = selectRef.current && selectRef.current.contains(relatedTarget);
        if (!isClickInDropdown) {
          handleBlur(e);
        }
      }}
    />
  );
};

const SelectReact = forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      options,
      value = "",
      onSelect,
      searchable = false,
      placeholder,
      emptyState = "No results",
      minHeight,
      minWidth,
      maxWidth,
      placement,
      className,
      fillWidth = true,
      style,
      multiple = false,
      children,
      ...rest
    },
    ref,
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [isFilled, setIsFilled] = useState(false);

    const [internalValue, setInternalValue] = useState(multiple ? [] : value);

    useEffect(() => {
      if (value !== undefined) {
        setInternalValue(value);
      }
    }, [value]);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [triggerWidth, setTriggerWidth] = useState(0);
    const searchInputId = useId();
    const [searchQuery, setSearchQuery] = useState("");
    const selectRef = useRef<HTMLDivElement | null>(null);
    const clearButtonRef = useRef<HTMLButtonElement>(null);

    // Track if we should skip the next focus event
    const skipNextFocusRef = useRef(false);
    // Track if we just selected an option to prevent reopening
    const justSelectedRef = useRef(false);

    const handleFocus = () => {
      // Allow reopening the dropdown even after selection
      setIsFocused(true);
      setIsDropdownOpen(true);
      // Set highlighted index to first option or current selection
      const currentIndex = options.findIndex((option) =>
        multiple
          ? Array.isArray(currentValue) && currentValue.includes(option.value)
          : option.value === currentValue,
      );
    };

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      // Don't close dropdown if focus is moving to an element within the select component
      if (selectRef.current && !selectRef.current.contains(event.relatedTarget as Node)) {
        // Only close if we're not moving to the dropdown or its children
        const isMovingToDropdown =
          event.relatedTarget && (event.relatedTarget as Element).closest("[data-dropdown]");

        if (!isMovingToDropdown) {
          setIsFocused(false);
          setIsDropdownOpen(false);
        }
      }
    };

    const handleSelect = (value: string) => {
      if (multiple) {
        const currentValues = Array.isArray(currentValue) ? currentValue : [];
        const newValues = currentValues.includes(value)
          ? currentValues.filter((v) => v !== value)
          : [...currentValues, value];
        setInternalValue(newValues);
        onSelect?.(newValues);
      } else {
        setInternalValue(value);
        onSelect?.(value);
        setIsDropdownOpen(false);
      }
      justSelectedRef.current = true;
    };

    const handleClearSearch = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setSearchQuery("");
      const input = selectRef.current?.querySelector("input");
      if (input) {
        input.focus();
      }
    };

    const currentValue = value !== undefined ? value : internalValue;
    const selectedOption = options.find((opt) => opt.value === currentValue) || null;

    const selectedValues: string[] = multiple
      ? Array.isArray(currentValue)
        ? currentValue
        : []
      : currentValue
        ? [String(currentValue)]
        : [];

    const removeValue = (removed: string) => {
      const next = selectedValues.filter((value) => value !== removed);
      setInternalValue(next);
      onSelect?.(next);
    };

    const clearAll = () => {
      setInternalValue([]);
      onSelect?.([]);
    };

    /** What the closed field shows: the value, chips for several, or a hint. */
    const renderContent = (): ReactNode => {
      if (selectedValues.length === 0) {
        return placeholder ? (
          <Text variant="body-default-m" onBackground="neutral-weak">
            {placeholder}
          </Text>
        ) : undefined;
      }

      const labelOf = (value: string): ReactNode => {
        const option = options.find((candidate) => candidate.value === value);
        return option?.label ?? <Text onBackground="neutral-weak">{unknownLabel(value)}</Text>;
      };

      if (!multiple) {
        return (
          <SelectDisplayContext.Provider value="plain">
            {labelOf(selectedValues[0])}
          </SelectDisplayContext.Provider>
        );
      }

      const visible = selectedValues.slice(0, MAX_VISIBLE_CHIPS);
      const hidden = selectedValues.length - visible.length;

      return (
        <SelectDisplayContext.Provider value="plain">
          <div className={styles.chips}>
            {visible.map((value) => (
              <span key={value} className={styles.chip}>
                <span className={styles.chipLabel}>{labelOf(value)}</span>
                <button
                  type="button"
                  aria-label="Remove"
                  className={styles.chipRemove}
                  // Keep focus where it is, otherwise removing a chip would reopen the list.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={(event) => {
                    event.stopPropagation();
                    removeValue(value);
                  }}
                >
                  <Icon name="close" size="xs" />
                </button>
              </span>
            ))}
            {hidden > 0 && (
              <span className={`${styles.chip} ${styles.chipStatic}`}>
                <Text variant="label-default-s" onBackground="neutral-weak">
                  +{hidden} more
                </Text>
              </span>
            )}
          </div>
        </SelectDisplayContext.Provider>
      );
    };

    // once-ui sizes the floating surface to its content, which leaves a short
    // list far narrower than the field it belongs to. Match the field instead.
    useLayoutEffect(() => {
      if (isDropdownOpen && selectRef.current) {
        setTriggerWidth(selectRef.current.getBoundingClientRect().width);
      }
    }, [isDropdownOpen]);

    useEffect(() => {
      if (isDropdownOpen) {
        // Reset skip flag when dropdown opens
        skipNextFocusRef.current = false;

        // If searchable is true, focus the search input
        if (searchable) {
          setTimeout(() => {
            const searchInput = selectRef.current?.querySelector(
              `#select-search-${searchInputId}`,
            ) as HTMLInputElement;
            if (searchInput) {
              searchInput.focus();
            }
          }, 0);
        }
      }
    }, [isDropdownOpen, searchable, searchInputId]);

    // Filter options based on search query
    const query = searchQuery.trim().toLowerCase();
    const filteredOptions = options.filter(
      (option) => !searchable || !query || nodeText(option.label).toLowerCase().includes(query),
    );

    return (
      <DropdownWrapper
        fillWidth={fillWidth}
        minWidth={minWidth}
        maxWidth={maxWidth}
        ref={(node) => {
          selectRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        isOpen={isDropdownOpen}
        onOpenChange={setIsDropdownOpen}
        placement={placement}
        closeAfterClick={false}
        disableTriggerClick={true}
        style={{
          ...style,
        }}
        trigger={
          <DummyInput
            {...rest}
            style={{
              textOverflow: "ellipsis",
              ...style,
            }}
            cursor="interactive"
            content={renderContent()}
            placeholder={placeholder}
            onFocus={handleFocus}
            className={classNames("fill-width", {
              [inputStyles.filled]: isFilled,
              [inputStyles.focused]: isFocused,
              className,
            })}
            aria-haspopup="listbox"
            aria-expanded={isDropdownOpen}
          />
        }
        dropdown={
          <SelectDisplayContext.Provider value="plain">
            <Column
              fillWidth
              padding="4"
              data-dropdown="true"
              style={{ minWidth: triggerWidth || undefined }}
            >
              <ArrowNavigation
                layout="column"
                itemCount={filteredOptions.length}
                onSelect={(index) => {
                  if (index >= 0 && index < filteredOptions.length) {
                    handleSelect(filteredOptions[index].value);
                  }
                }}
                onEscape={() => setIsDropdownOpen(false)}
                autoFocus={!searchable}
                disabled={false}
              >
                {searchable && (
                  <SearchInput
                    searchInputId={searchInputId}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    setIsDropdownOpen={setIsDropdownOpen}
                    handleClearSearch={handleClearSearch}
                    handleBlur={handleBlur}
                    selectRef={selectRef}
                  />
                )}

                <Column fillWidth paddingTop="4" gap="2" className={styles.list}>
                  {filteredOptions.map((option) => {
                    const isSelected = selectedValues.includes(option.value);

                    return (
                      <Option
                        key={option.value}
                        {...option}
                        onClick={() => {
                          option.onClick?.(option.value);
                          // A single select closes itself in handleSelect; a multiple
                          // one stays open so several options can be picked in a row.
                          handleSelect(option.value);
                        }}
                        selected={isSelected}
                        // once-ui marks highlighted rows as aria-selected too, so the stylesheet
                        // needs its own reliable hook to tell a chosen option from a hovered one.
                        data-selected={isSelected ? "true" : undefined}
                        tabIndex={-1}
                        hasPrefix={
                          multiple ? (
                            // A fixed slot, so the labels do not shift once something is selected.
                            <span className={styles.checkSlot}>
                              {isSelected && (
                                <Icon name="check" size="xs" onBackground="brand-medium" />
                              )}
                            </span>
                          ) : undefined
                        }
                      />
                    );
                  })}

                  {filteredOptions.length === 0 && (
                    <Flex fillWidth center paddingX="16" paddingY="32">
                      {emptyState}
                    </Flex>
                  )}
                </Column>
              </ArrowNavigation>

              {multiple && selectedValues.length > 0 && (
                <Row
                  fillWidth
                  horizontal="between"
                  vertical="center"
                  paddingX="8"
                  paddingY="4"
                  marginTop="4"
                  className={styles.footer}
                >
                  <Text variant="body-default-xs" onBackground="neutral-weak">
                    {selectedValues.length} selected
                  </Text>
                  <button
                    type="button"
                    className={styles.clear}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={clearAll}
                  >
                    Clear
                  </button>
                </Row>
              )}
            </Column>
          </SelectDisplayContext.Provider>
        }
      />
    );
  },
);

SelectReact.displayName = "SelectReact";
export { SelectReact };
