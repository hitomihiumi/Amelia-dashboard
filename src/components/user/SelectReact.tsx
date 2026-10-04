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
import { useT } from "@/i18n/client";
import type { Translator } from "@/i18n/translate";

import { DummyInput } from "./DummyInput";

type SelectOptionType = Omit<OptionProps, "selected">;

// Derived from once-ui so this file does not depend on @floating-ui directly.
type Placement = NonNullable<DropdownWrapperProps["placement"]>;

/** A focus this soon after the list closed is the dropdown restoring focus, not a click. */
const FOCUS_RESTORE_WINDOW_MS = 250;

/** Chips shown inside the closed field before the rest collapses into "+N more". */
const MAX_VISIBLE_CHIPS = 10;

/** Saved ids whose channel or role no longer exists should not render as blanks. */
function unknownLabel(value: string, t: Translator): string {
  return /^\d{15,}$/.test(value) ? t("common.select.unknownId", { id: value.slice(-4) }) : value;
}

export interface SelectProps
  extends Pick<
      InputProps,
      | "id"
      | "label"
      | "size"
      | "error"
      | "errorMessage"
      | "description"
      | "corners"
      | "prefix"
      | "suffix"
      | "validate"
      | "characterCount"
      | "placeholder"
    >,
    Omit<React.HTMLAttributes<HTMLDivElement>, "onSelect" | "prefix" | "placeholder" | "content" | "id">,
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
  const t = useT();
  const { handleKeyDown: navKeyDown } = useArrowNavigationContext();

  return (
    <Input
      data-scaling="90"
      id={`select-search-${searchInputId}`}
      placeholder={t("common.select.search")}
      size="s"
      suffix={
        searchQuery ? (
          <IconButton
            tooltip={t("common.select.clearSearch")}
            tooltipPosition="left"
            icon="close"
            variant="ghost"
            size="s"
            onClick={handleClearSearch}
          />
        ) : undefined
      }
      prefix={<Icon name="search" size="xs" />}
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
          // The dropdown hands focus back to the field when it closes.
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
      emptyState,
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
    const t = useT();
    const [isFocused, setIsFocused] = useState(false);
    const [isFilled, setIsFilled] = useState(false);

    const [internalValue, setInternalValue] = useState(multiple ? [] : value);

    useEffect(() => {
      if (value !== undefined) {
        setInternalValue(value);
      }
    }, [value]);
    const [isDropdownOpen, setIsDropdownOpenRaw] = useState(false);
    // The dropdown traps focus while it is open and hands it back to the field when it closes.
    // That returning focus would hit handleFocus and open the list again, so closings are
    // timestamped and a focus right after one is not read as the user asking to open it.
    const closedAtRef = useRef(0);
    const setIsDropdownOpen = (open: boolean) => {
      if (!open) {
        closedAtRef.current = Date.now();
        // A stale filter would reopen the list already narrowed down.
        setSearchQuery("");
      }
      setIsDropdownOpenRaw(open);
    };
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
      if (Date.now() - closedAtRef.current < FOCUS_RESTORE_WINDOW_MS) {
        setIsFocused(true);
        return;
      }
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
      document.getElementById(`select-search-${searchInputId}`)?.focus();
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
        return option?.label ?? <Text onBackground="neutral-weak">{unknownLabel(value, t)}</Text>;
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
                  aria-label={t("common.select.remove")}
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
                  {t("common.select.more", { count: hidden })}
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

        // If searchable is true, focus the search input. The list renders in a portal and is
        // only mounted and positioned a frame or two after opening, so wait for it.
        if (searchable) {
          let frames = 0;
          let steady = 0;
          let raf = 0;
          const focusSearch = () => {
            const searchInput = document.getElementById(
              `select-search-${searchInputId}`,
            ) as HTMLInputElement | null;
            if (searchInput && document.activeElement !== searchInput) {
              searchInput.focus({ preventScroll: true });
              steady = 0;
            } else if (searchInput) {
              steady++;
            }
            // Keep going until focus has held for a few frames: the dropdown's own focus
            // handling runs once it is positioned and can move focus away again.
            if (steady < 3 && frames++ < 30) raf = requestAnimationFrame(focusSearch);
          };
          raf = requestAnimationFrame(focusSearch);
          return () => cancelAnimationFrame(raf);
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
        open={isDropdownOpen}
        onOpenChange={setIsDropdownOpen}
        placement={placement}
        closeAfterClick={false}
        // The list below runs its own ArrowNavigation; a second one from the wrapper
        // would steal focus from the search field once the panel is positioned.
        handleArrowNavigation={false}
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
            // Focus is handed back to the field when the list closes, so a second click lands on
            // a field that is already focused and never raises a focus event of its own.
            onClick={() => {
              if (!isDropdownOpen) setIsDropdownOpen(true);
            }}
            className={classNames("fill-width", {
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
                        prefix={
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
                      {emptyState ?? t("common.state.noResults")}
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
                    {t("common.select.selectedCount", { count: selectedValues.length })}
                  </Text>
                  <button
                    type="button"
                    className={styles.clear}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={clearAll}
                  >
                    {t("common.select.clearAll")}
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
