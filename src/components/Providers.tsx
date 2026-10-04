"use client";

import {
  BorderStyle,
  DataThemeProvider,
  IconProvider,
  NeutralColor,
  ScalingSize,
  Schemes,
  SolidStyle,
  SolidType,
  SurfaceStyle,
  Theme,
  ThemeProvider,
  ToastProvider,
  TransitionStyle,
} from "@once-ui-system/core";
import { LayoutProvider } from "@once-ui-system/core/next";
import type { ChartMode, ChartVariant } from "@once-ui-system/core/data";
import { style, dataStyle } from "../resources/once-ui.config";
import { iconLibrary } from "../resources/icons";
import { SessionProvider } from "next-auth/react";
import { I18nProvider } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import type { Messages } from "@/i18n/messages";
import { DiscordOAuthMessageBridge } from "@/components/auth/DiscordOAuthMessageBridge";

export function Providers({
  children,
  session,
  locale,
  messages,
}: {
  children: React.ReactNode;
  session: any;
  locale: Locale;
  messages: Messages;
}) {
  return (
    <SessionProvider session={session}>
      <I18nProvider locale={locale} messages={messages}>
      <DiscordOAuthMessageBridge />
      <LayoutProvider>
        <ThemeProvider
          theme={style.theme as Theme}
          brand={style.brand as Schemes}
          accent={style.accent as Schemes}
          neutral={style.neutral as NeutralColor}
          solid={style.solid as SolidType}
          solidStyle={style.solidStyle as SolidStyle}
          border={style.border as BorderStyle}
          surface={style.surface as SurfaceStyle}
          transition={style.transition as TransitionStyle}
          scaling={style.scaling as ScalingSize}
        >
          <DataThemeProvider
            variant={dataStyle.variant as ChartVariant}
            mode={dataStyle.mode as ChartMode}
            height={dataStyle.height}
            axis={{
              stroke: dataStyle.axis.stroke,
            }}
            tick={{
              fill: dataStyle.tick.fill,
              fontSize: dataStyle.tick.fontSize,
              line: dataStyle.tick.line,
            }}
          >
            <ToastProvider>
              <IconProvider icons={iconLibrary}>{children}</IconProvider>
            </ToastProvider>
          </DataThemeProvider>
        </ThemeProvider>
      </LayoutProvider>
      </I18nProvider>
    </SessionProvider>
  );
}
