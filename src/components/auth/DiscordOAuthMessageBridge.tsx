"use client";

import { useEffect } from "react";

export function DiscordOAuthMessageBridge() {
  useEffect(() => {
    const handleLoginSuccess = (nextPath?: string | null) => {
      const targetUrl = nextPath || "/dashboard";
      if (window.location.pathname === targetUrl) {
        window.location.reload();
      } else {
        window.location.href = targetUrl;
      }
    };

    const channel = new BroadcastChannel("amelia_auth_channel");
    channel.onmessage = (event) => {
      if (event.data?.type === "oauth_done") {
        handleLoginSuccess(event.data.next);
      }
    };

    const onStorage = (e: StorageEvent) => {
      if (e.key === "amelia_auth_sync") {
        const nextPath = localStorage.getItem("amelia_auth_next");
        localStorage.removeItem("amelia_auth_sync");
        localStorage.removeItem("amelia_auth_next");
        handleLoginSuccess(nextPath);
      }
    };

    window.addEventListener("storage", onStorage);

    return () => {
      channel.close();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return null;
}
