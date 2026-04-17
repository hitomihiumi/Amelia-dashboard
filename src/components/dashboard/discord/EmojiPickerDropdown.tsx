"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  DropdownWrapper,
  StyleProps,
  gridSize,
  Button,
  Spinner,
  Column,
} from "@once-ui-system/core";
import { EmojiPicker } from "./EmojiPicker";
import { DiscordGuildEmoji } from "@/lib/discord/emojis-api";

export interface EmojiPickerDropdownProps {
  guildId: string;
  onSelect: (emoji: DiscordGuildEmoji) => void;
  onOpenChange?: (isOpen: boolean) => void;
  background?: StyleProps["background"];
  columns?: gridSize;
  closeAfterClick?: boolean;
}

const EmojiPickerDropdown: React.FC<EmojiPickerDropdownProps> = ({
  guildId,
  onSelect,
  closeAfterClick = true,
  background = "surface",
  columns = "8",
  ...dropdownProps
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emojiData, setEmojiData] = useState<DiscordGuildEmoji[]>([]);

  const load = useCallback(async () => {
    if (emojiData.length === 0) {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/dashboard/${guildId}/emojis`);
        const j = (await res.json()) as {
          ok?: boolean;
          emojis?: DiscordGuildEmoji[];
          error?: string;
        };
        if (!res.ok || !j.ok) {
          setError(j.error ?? "Не удалось загрузить эмодзи");
          setEmojiData([]);
          return;
        }
        setEmojiData(j.emojis ?? []);
      } catch {
        setError("Ошибка сети");
        setEmojiData([]);
      } finally {
        setLoading(false);
      }
    }
  }, [guildId, emojiData]);

  const handleEmojiSelect = (emoji: DiscordGuildEmoji) => {
    onSelect(emoji);
    if (closeAfterClick) {
      dropdownProps.onOpenChange?.(false);
    }
  };

  return (
    <DropdownWrapper
      {...dropdownProps}
      trigger={<Button onClick={load}>Change Emoji</Button>}
      handleArrowNavigation={false}
      placement={"bottom"}
      dropdown={
        <>
          {loading ? (
            <Column
              gap="16"
              background={background}
              data-testid="emoji-picker"
              height={24}
              width={18}
              center
            >
              <Spinner />
            </Column>
          ) : (
            <EmojiPicker
              guildId={guildId}
              emojiData={emojiData}
              columns={columns}
              padding="8"
              onSelect={handleEmojiSelect}
              onClose={closeAfterClick ? () => dropdownProps.onOpenChange?.(false) : undefined}
              background={background}
            />
          )}
        </>
      }
    />
  );
};

export { EmojiPickerDropdown };
