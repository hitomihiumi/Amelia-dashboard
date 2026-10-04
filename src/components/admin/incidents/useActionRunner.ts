"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@once-ui-system/core";
import { useT } from "@/i18n/client";
import type { IncidentActionResult } from "@/app/admin/incidents/actions";

/**
 * Runs a server action, toasts the outcome and refreshes the page data. `pending`
 * stays true until the refreshed page has arrived, so buttons do not flicker back
 * to their old state while the list is still stale.
 */
export function useActionRunner() {
  const t = useT();
  const router = useRouter();
  const { addToast } = useToast();
  const [running, setRunning] = useState(false);
  const [refreshing, startRefresh] = useTransition();

  const run = useCallback(
    async (
      action: () => Promise<IncidentActionResult>,
      successMessage?: string,
      options?: { refresh?: boolean },
    ): Promise<IncidentActionResult | null> => {
      setRunning(true);

      try {
        const result = await action();

        if (result.ok) {
          if (successMessage) addToast({ message: successMessage, variant: "success" });
          if (options?.refresh !== false) startRefresh(() => router.refresh());
        } else {
          addToast({ message: result.error, variant: "danger" });
        }

        return result;
      } catch (error) {
        console.error("[Incidents] Action failed:", error);
        addToast({ message: t("adminIncidents.errors.updateFailed"), variant: "danger" });
        return null;
      } finally {
        setRunning(false);
      }
    },
    [addToast, router, t],
  );

  return { run, pending: running || refreshing };
}
