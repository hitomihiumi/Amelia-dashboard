"use client";

import {
  Column,
  DropdownWrapper,
  Flex,
  Icon,
  IconButton,
  Input,
  type InputProps,
  Slider,
} from "@once-ui-system/core";
import React, { forwardRef, useCallback, useEffect, useRef, useState } from "react";

export interface ColorInputProps extends Omit<InputProps, "onChange" | "value" | "type"> {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Emit `rgba(...)` instead of a plain hex, with an opacity slider. */
  supportAlpha?: boolean;
  /** Quick-pick swatches rendered below the input. */
  presets?: string[];
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** "fff" / "#fff" / "ffffff" / "#FFFFFF" -> "#rrggbb" (lowercase), or null if invalid. */
function normalizeHex(input: string): string | null {
  const h = input.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(h)) {
    return `#${h
      .split("")
      .map((c) => c + c)
      .join("")
      .toLowerCase()}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(h)) return `#${h.toLowerCase()}`;
  return null;
}

function hexToRgba(hex: string, alphaPercent: number): string {
  const normalized = normalizeHex(hex);
  if (!normalized) return "";
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alphaPercent, 0, 100) / 100})`;
}

function rgbaToHex(rgba: string): { hex: string; alpha: number } {
  const match = /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/.exec(rgba);
  if (!match) return { hex: "", alpha: 100 };
  const [r, g, b] = [match[1], match[2], match[3]].map((v) => clamp(parseInt(v, 10), 0, 255));
  const alpha = match[4] ? Math.round(clamp(parseFloat(match[4]), 0, 1) * 100) : 100;
  const hex = `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
  return { hex, alpha };
}

function parseValue(value: string): { hex: string; alpha: number } {
  if (value.startsWith("rgb")) return rgbaToHex(value);
  return { hex: normalizeHex(value) ?? "", alpha: 100 };
}

const ColorInput = forwardRef<HTMLInputElement, ColorInputProps>(
  ({ label, id, value, onChange, supportAlpha = false, presets, ...props }, ref) => {
    const nativeColorRef = useRef<HTMLInputElement>(null);
    const [alphaMenuOpen, setAlphaMenuOpen] = useState(false);

    const initial = parseValue(value);
    const [hexValue, setHexValue] = useState(initial.hex);
    const [alpha, setAlpha] = useState(initial.alpha);
    const [draft, setDraft] = useState(initial.hex);

    // Re-sync when `value` changes from outside (e.g. switching which item is
    // being edited) — a plain useState initializer only captures the mount-time value.
    useEffect(() => {
      const next = parseValue(value);
      setHexValue(next.hex);
      setAlpha(next.alpha);
      setDraft(next.hex);
    }, [value]);

    const emit = useCallback(
      (hex: string, alphaPercent: number) => {
        const emitted = hex ? (supportAlpha ? hexToRgba(hex, alphaPercent) : hex) : "";
        onChange({ target: { value: emitted } } as React.ChangeEvent<HTMLInputElement>);
      },
      [onChange, supportAlpha],
    );

    const applyHex = useCallback(
      (hex: string) => {
        setHexValue(hex);
        setDraft(hex);
        emit(hex, alpha);
      },
      [alpha, emit],
    );

    const handleAlphaChange = useCallback(
      (next: number) => {
        setAlpha(next);
        if (hexValue) emit(hexValue, next);
      },
      [hexValue, emit],
    );

    const commitDraft = useCallback(() => {
      if (!draft.trim()) {
        applyHex("");
        return;
      }
      const normalized = normalizeHex(draft);
      if (normalized) applyHex(normalized);
      else setDraft(hexValue); // invalid entry — revert to the last known-good value
    }, [draft, hexValue, applyHex]);

    return (
      <Column gap="8" fillWidth>
        {/* Hidden native color input — purely a click target that opens the OS picker. */}
        <input
          ref={nativeColorRef}
          type="color"
          tabIndex={-1}
          aria-hidden
          value={hexValue || "#000000"}
          onChange={(e) => applyHex(e.target.value)}
          style={{ position: "absolute", width: 0, height: 0, opacity: 0, pointerEvents: "none" }}
        />
        <Input
          ref={ref}
          id={id}
          label={label}
          placeholder="#5865f2"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitDraft();
            }
          }}
          {...props}
          hasPrefix={
            <Flex
              cursor="interactive"
              onClick={() => nativeColorRef.current?.click()}
              marginLeft="4"
              width="20"
              height="20"
              radius="xs"
              border="neutral-strong"
              horizontal="center"
              vertical="center"
              style={{ backgroundColor: hexValue || "transparent", flexShrink: 0 }}
            >
              {!hexValue && <Icon size="xs" name="eyeDropper" onBackground="neutral-medium" />}
            </Flex>
          }
          hasSuffix={
            hexValue ? (
              <Flex gap="4" vertical="center">
                {supportAlpha && (
                  <DropdownWrapper
                    isOpen={alphaMenuOpen}
                    onOpenChange={setAlphaMenuOpen}
                    placement="top-end"
                    trigger={
                      <IconButton
                        variant="secondary"
                        size="s"
                        tooltip="Adjust opacity"
                        tooltipPosition="left"
                        icon="opacity"
                      />
                    }
                    dropdown={
                      <Column padding="16" gap="12" fillWidth minWidth={12}>
                        <Slider
                          value={alpha}
                          onChange={handleAlphaChange}
                          min={0}
                          max={100}
                          step={1}
                          label="Opacity"
                          showValue
                        />
                      </Column>
                    }
                  />
                )}
                <IconButton
                  onClick={() => applyHex("")}
                  variant="secondary"
                  size="s"
                  tooltip="Remove"
                  tooltipPosition={supportAlpha ? "bottom" : "left"}
                  icon="close"
                />
              </Flex>
            ) : undefined
          }
        />
        {presets && presets.length > 0 && (
          <Flex wrap gap="4">
            {presets.map((preset) => {
              const presetHex = normalizeHex(preset) ?? preset;
              const active = hexValue.toLowerCase() === presetHex.toLowerCase();
              return (
                <button
                  key={preset}
                  type="button"
                  aria-label={`Color ${preset}`}
                  onClick={() => applyHex(presetHex)}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 4,
                    backgroundColor: presetHex,
                    border: active
                      ? "2px solid var(--scheme-brand-500)"
                      : "1px solid rgba(255,255,255,0.2)",
                    cursor: "pointer",
                  }}
                />
              );
            })}
          </Flex>
        )}
      </Column>
    );
  },
);
ColorInput.displayName = "ColorInput";

export { ColorInput };
