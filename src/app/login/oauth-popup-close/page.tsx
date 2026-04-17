"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Flex, Text, Spinner } from "@once-ui-system/core";

export default function OAuthPopupClosePage() {
  const searchParams = useSearchParams();
  const nextRaw = searchParams.get("next");
  const [showManualClose, setShowManualClose] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isPopup = window.opener !== null && window.opener !== window;

    if (isPopup) {
      const channel = new BroadcastChannel("amelia_auth_channel");
      channel.postMessage({ type: "oauth_done", next: nextRaw });
      channel.close();

      localStorage.setItem("amelia_auth_sync", Date.now().toString());
      if (nextRaw) localStorage.setItem("amelia_auth_next", nextRaw);

      window.close();

      const timer = setTimeout(() => setShowManualClose(true), 2000);
      return () => clearTimeout(timer);
    } else {
      window.location.replace(nextRaw || "/dashboard");
    }
  }, [nextRaw]);

  return (
    <Flex direction="column" vertical="center" horizontal="center" fillWidth fillHeight gap="16">
      <Spinner size="l" />
      <Text variant="body-default-s" onBackground="neutral-strong">
        Finishing login...
      </Text>

      {showManualClose && (
        <Text variant="body-default-xs" onBackground="danger-medium">
          If this page doesn't close automatically, please close it manually and return to the
          original tab.
        </Text>
      )}
    </Flex>
  );
}
