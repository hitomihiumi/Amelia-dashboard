"use client";

import { useT } from "@/i18n/client";
import type { ModalCustom } from "@/lib/db/types";
import React from "react";

export interface DiscordModalProps {
  modal: ModalCustom;
}

export function DiscordModal({ modal }: DiscordModalProps) {
  const t = useT();
  return (
    <div className="w-full h-full grid place-items-center p-5">
      <div className="w-full max-w-[480px] max-h-full overflow-y-auto bg-discord-bg-primary rounded-[8px] text-discord-text-normal shadow-[0_8px_32px_rgba(0,0,0,0.5)] p-3">
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-white text-[18px] font-semibold truncate max-w-[70%]">
            {modal.title || t("builder.preview.modalTitle")}
          </h3>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            className="text-discord-text-muted shrink-0"
          >
            <path
              d="M18 6 6 18M6 6l12 12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <div className="px-4 pb-2 flex flex-col gap-4">
          {modal.fields.length === 0 && (
            <div className="text-discord-text-muted text-sm py-4 text-center">
              {t("builder.preview.noFields")}
            </div>
          )}
          {modal.fields.map((field) => (
            <div key={field.id} className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase font-semibold text-discord-text-faint tracking-wide">
                {field.name || t("builder.preview.fieldFallback")}
                {field.required && <span className="text-discord-red ml-0.5">*</span>}
              </label>
              <div
                className={
                  "min-h-[44px] px-3 py-2.5 rounded-sm bg-discord-bg-tertiary border border-discord-bg-tertiary text-sm text-discord-text-muted " +
                  (field.type === "long" ? "min-h-[100px]" : "")
                }
              >
                {field.placeholder || t("builder.preview.enterAnswer")}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-discord-text-muted">
                  {field.type === "long"
                    ? t("builder.preview.answerLong")
                    : t("builder.preview.answerShort")}
                </span>
                {(field.min || field.max) && (
                  <span className="text-[11px] text-discord-text-muted">
                    {t("builder.preview.charRange", { min: field.min ?? 0, max: field.max ?? "∞" })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-2 px-4 py-3">
          <button
            type="button"
            className="px-3 h-9 rounded-sm  text-sm font-medium text-discord-text-faint hover:underline"
          >
            {t("common.actions.cancel")}
          </button>
          <button
            type="button"
            className="px-3 h-9 rounded-sm  text-sm font-semibold text-white bg-discord-brand hover:bg-discord-brand-hover"
          >
            {t("builder.preview.submit")}
          </button>
        </div>
      </div>
    </div>
  );
}
