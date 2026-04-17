"use client";

import {
  BorderStyle,
  ChartMode,
  ChartVariant,
  DataThemeProvider,
  IconProvider,
  LayoutProvider,
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
import { style, dataStyle } from "../resources/once-ui.config";
import { iconLibrary } from "../resources/icons";
import { SessionProvider } from "next-auth/react";
import { DiscordOAuthMessageBridge } from "@/components/auth/DiscordOAuthMessageBridge";

export function Providers({ children, session }: { children: React.ReactNode; session: any }) {
  return (
    <SessionProvider session={session}>
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
    </SessionProvider>
  );
}
