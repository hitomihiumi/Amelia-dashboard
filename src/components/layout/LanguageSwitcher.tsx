"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Column, DropdownWrapper, Option } from "@once-ui-system/core";
import { LOCALES, LOCALE_META, type Locale } from "@/i18n/config";
import { setLocaleAction } from "@/i18n/actions";
import { useLocale, useT } from "@/i18n/client";

/** Compact flag + code button that opens the list of supported languages. */
export function LanguageSwitcher() {
  const router = useRouter();
  const t = useT();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const choose = (next: Locale) => {
    setOpen(false);
    if (next === locale) return;

    startTransition(async () => {
      const result = await setLocaleAction(next);
      if (result.ok) router.refresh();
    });
  };

  return (
    <DropdownWrapper
      open={open}
      onOpenChange={setOpen}
      placement="bottom-end"
      trigger={
        <Button
          variant="tertiary"
          size="m"
          loading={pending}
          aria-label={t("common.language.switchTo")}
        >
          {LOCALE_META[locale].flag} {locale.toUpperCase()}
        </Button>
      }
      dropdown={
        <Column gap="2" padding="4" minWidth={10}>
          {LOCALES.map((code) => (
            <Option
              key={code}
              fillWidth
              value={code}
              selected={code === locale}
              label={`${LOCALE_META[code].flag}  ${LOCALE_META[code].nativeName}`}
              onClick={() => choose(code)}
            />
          ))}
        </Column>
      }
    />
  );
}
