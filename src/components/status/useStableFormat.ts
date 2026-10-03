"use client";

import { useEffect, useMemo, useState } from "react";
import { useFormat } from "@/i18n/client";
import type { Formatters } from "@/i18n/format";

/**
 * Like `useFormat`, but calendar dates and clock times are shown in UTC until the
 * component has mounted, then in the viewer's own time zone. The server and the
 * browser rarely share a time zone, so formatting in the viewer's zone straight away
 * would make the server HTML and the first client render disagree.
 */
export function useStableFormat(): Formatters {
  const format = useFormat();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return useMemo<Formatters>(() => {
    if (mounted) return format;

    return {
      ...format,
      date: (value, options) =>
        format.date(value, { ...(options ?? { dateStyle: "medium" }), timeZone: "UTC" }),
      dateTime: (value, options) =>
        format.dateTime(value, {
          ...(options ?? { dateStyle: "medium", timeStyle: "short" }),
          timeZone: "UTC",
        }),
      time: (value, options) =>
        format.time(value, { ...(options ?? { timeStyle: "short" }), timeZone: "UTC" }),
    };
  }, [format, mounted]);
}
