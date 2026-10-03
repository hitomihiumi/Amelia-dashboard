"use client";

import { useT } from "@/i18n/client";
import { useCookieConsent } from "./CookieConsent";

/** Plain text button that reopens the consent panel; styled by the caller. */
export function CookieSettingsButton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const t = useT();
  const { openSettings } = useCookieConsent();

  return (
    <button type="button" onClick={openSettings} className={className} style={style}>
      {t("common.cookies.settings")}
    </button>
  );
}
