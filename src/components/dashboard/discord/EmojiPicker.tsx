"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  KeyboardEvent,
  useId,
  memo,
  useMemo,
} from "react";
import {
  IconButton,
  Grid,
  Flex,
  Input,
  Icon,
  Column,
  Row,
  useDebounce,
  StyleProps,
  gridSize,
  Media,
} from "@once-ui-system/core";
import { DiscordGuildEmoji, emojiCdnUrl } from "@/lib/discord/emojis-api";

import styles from "./EmojiPicker.module.scss";

export interface EmojiPickerProps extends Omit<React.ComponentProps<typeof Flex>, "onSelect"> {
  guildId: string;
  emojiData: DiscordGuildEmoji[];
  onSelect: (emoji: DiscordGuildEmoji) => void;
  onClose?: () => void;
  className?: string;
  background?: StyleProps["background"];
  columns?: gridSize;
  style?: React.CSSProperties;
}

// Memoized emoji button to prevent unnecessary re-renders
interface EmojiButtonProps {
  emoji: DiscordGuildEmoji;
  index: number;
  isFocused: boolean;
  onSelect: (emoji: DiscordGuildEmoji) => void;
  onFocus: (index: number) => void;
}

const EmojiButton = memo(({ emoji, index, isFocused, onSelect, onFocus }: EmojiButtonProps) => {
  return (
    <IconButton
      key={index}
      tabIndex={index === 0 || isFocused ? 0 : -1}
      variant="tertiary"
      size="l"
      onClick={() => onSelect(emoji)}
      aria-label={emoji.name}
      title={emoji.name}
      className={styles.emojiButton}
      onFocus={() => onFocus(index)}
      role="gridcell"
      radius={"none"}
      ref={isFocused ? (el) => el?.focus() : undefined}
    >
      <Media src={emojiCdnUrl(emoji, 32)} maxWidth={"32"} maxHeight={"32"} />
    </IconButton>
  );
});

EmojiButton.displayName = "EmojiButton";

const EmojiPicker = ({
  guildId,
  emojiData,
  onSelect,
  onClose,
  className,
  background,
  columns = "8",
  style,
  ...flex
}: EmojiPickerProps) => {
  const searchInputId = useId();
  const [inputValue, setInputValue] = useState("");
  const searchQuery = useDebounce(inputValue, 300);
  const [focusedEmojiIndex, setFocusedEmojiIndex] = useState<number>(-1);
  const gridRef = useRef<HTMLDivElement>(null);

  const handleEmojiSelect = useCallback(
    (emoji: DiscordGuildEmoji) => {
      onSelect(emoji);
      if (onClose) {
        onClose();
      }
    },
    [onSelect, onClose],
  );

  const filteredEmojis = useMemo(
    () =>
      searchQuery
        ? Object.values(emojiData)
            .flat()
            .filter((emoji: DiscordGuildEmoji) => emoji.name.includes(searchQuery.toLowerCase()))
        : emojiData || [],
    [searchQuery],
  );

  // Reset focused index when filtered emojis change
  useEffect(() => {
    setFocusedEmojiIndex(-1);
  }, [filteredEmojis]);

  // Memoize the onFocus handler to prevent re-creating on every render
  const handleFocus = useCallback((index: number) => {
    setFocusedEmojiIndex(index);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (filteredEmojis.length === 0) return;

      // Use provided columns prop for grid navigation
      const emojisPerRow = Number(columns) || 6;

      let newIndex = focusedEmojiIndex;

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          newIndex = focusedEmojiIndex < filteredEmojis.length - 1 ? focusedEmojiIndex + 1 : 0;
          break;
        case "ArrowLeft":
          e.preventDefault();
          newIndex = focusedEmojiIndex > 0 ? focusedEmojiIndex - 1 : filteredEmojis.length - 1;
          break;
        case "ArrowDown":
          e.preventDefault();
          newIndex = focusedEmojiIndex + emojisPerRow;
          if (newIndex >= filteredEmojis.length) {
            // Wrap to the beginning of the appropriate column
            newIndex = focusedEmojiIndex % emojisPerRow;
            if (newIndex >= filteredEmojis.length) newIndex = filteredEmojis.length - 1;
          }
          break;
        case "ArrowUp":
          e.preventDefault();
          newIndex = focusedEmojiIndex - emojisPerRow;
          if (newIndex < 0) {
            // Wrap to the end of the appropriate column
            const rowsCount = Math.ceil(filteredEmojis.length / emojisPerRow);
            newIndex = (rowsCount - 1) * emojisPerRow + (focusedEmojiIndex % emojisPerRow);
            if (newIndex >= filteredEmojis.length) {
              newIndex = filteredEmojis.length - 1;
            }
          }
          break;
        case "Enter":
        case " ":
          if (focusedEmojiIndex >= 0 && focusedEmojiIndex < filteredEmojis.length) {
            e.preventDefault();
            handleEmojiSelect(filteredEmojis[focusedEmojiIndex]);
          }
          break;
        default:
          return;
      }

      setFocusedEmojiIndex(newIndex);
    },
    [filteredEmojis, focusedEmojiIndex, handleEmojiSelect, columns],
  );

  return (
    <Column
      gap="16"
      background={background}
      className={className}
      style={style}
      data-testid="emoji-picker"
      height={24}
      {...flex}
    >
      <Input
        id={`emoji-search-${searchInputId}`}
        placeholder="Search emojis"
        value={inputValue}
        height="s"
        onChange={(e) => setInputValue(e.target.value)}
        hasPrefix={<Icon size="s" onBackground="neutral-weak" name="search" />}
        aria-label="Search emojis"
      />

      <Column tabIndex={-1} fillHeight overflowY="auto" overflowX="hidden">
        {filteredEmojis.length > 0 ? (
          <Grid
            gap="2"
            fillWidth
            columns={columns}
            aria-label={searchQuery ? "Search results" : `${emojiData.length} emojis`}
            ref={gridRef}
            onKeyDown={handleKeyDown}
            tabIndex={-1}
            role="grid"
            paddingRight={"20"}
            paddingLeft={"2"}
            paddingY={"4"}
          >
            {filteredEmojis.map((emoji, index: number) => (
              <EmojiButton
                key={index}
                emoji={emoji}
                index={index}
                isFocused={index === focusedEmojiIndex}
                onSelect={handleEmojiSelect}
                onFocus={handleFocus}
              />
            ))}
          </Grid>
        ) : (
          <Row fill center align="center" onBackground="neutral-weak">
            No results found
          </Row>
        )}
      </Column>
    </Column>
  );
};

EmojiPicker.displayName = "EmojiPicker";

export { EmojiPicker };
