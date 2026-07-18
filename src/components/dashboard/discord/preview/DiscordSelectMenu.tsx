"use client";

import type { SelectMenuCustom } from "@/lib/db/types";
import React, { useState } from "react";
import { DiscordEmoji } from "./DiscordButton";

export interface DiscordSelectMenuProps {
  menu: SelectMenuCustom;
}

export function DiscordSelectMenu({ menu }: DiscordSelectMenuProps) {
  const [open, setOpen] = useState(false);
  const selected = menu.options.find((o) => o.default) ?? null;
  const disabled = menu.disabled;

  return (
    <div className="relative w-[min(100%,432px)]">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="group flex items-center justify-between w-full h-10 px-3 rounded-lg bg-discord-bg-tertiary text-discord-text-faint border border-discord-bg-tertiary hover:border-discord-interactive-muted disabled:opacity-50 disabled:cursor-not-allowed text-sm"
      >
        <div className="flex items-center gap-2 min-w-0">
          {selected?.emoji && <DiscordEmoji value={selected.emoji} />}
          <span className={selected ? "truncate text-discord-text-normal" : "truncate"}>
            {selected ? selected.label : menu.placeholder || "Select an option"}
          </span>
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          className={open ? "rotate-180 transition-transform" : "transition-transform"}
        >
          <path
            d="M3 5l3 3 3-3"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-discord-bg-floating rounded-lg shadow-[0_8px_16px_rgba(0,0,0,0.3)] overflow-hidden max-h-[280px] overflow-y-auto">
          {menu.options.map((opt, i) => (
            <div
              key={i}
              className="flex items-center gap-2 px-3 py-2 text-sm text-discord-text-normal hover:bg-discord-bg-modifier-hover cursor-pointer h-10"
              onClick={() => setOpen(false)}
            >
              {opt.emoji && <DiscordEmoji value={opt.emoji} />}
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-white font-medium truncate">{opt.label}</span>
                  {opt.default && <span className="text-discord-green text-xs">✓</span>}
                </div>
                {opt.description && (
                  <span className="text-discord-text-muted text-[12px] truncate">
                    {opt.description}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
