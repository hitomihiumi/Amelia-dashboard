"use client";

import { useT } from "@/i18n/client";
import { SmartLink } from "@once-ui-system/core";
import { useCookieConsent } from "./CookieConsent";

/** Link-styled control that reopens the consent panel. */
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
    <SmartLink
      href="#cookie-settings"
      role="button"
      onClick={(event) => {
        event.preventDefault();
        openSettings();
      }}
      className={className}
      style={style}
    >
      {t("common.cookies.settings")}
    </SmartLink>
  );
}
