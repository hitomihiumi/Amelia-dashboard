import React from "react";
import { guildIconUrl } from "@/lib/admin/servers";
import styles from "./Servers.module.scss";

/** The server's icon, or its first letter on a neutral tile. */
export function ServerIcon({
  id,
  icon,
  name,
  size = 64,
}: { id: string; icon: string | null; name: string; size?: number }) {
  const url = guildIconUrl(id, icon, size);
  if (!url) {
    return (
      <span className={styles.iconFallback} aria-hidden>
        {Array.from(name)[0]?.toUpperCase() ?? "?"}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" width={40} height={40} className={styles.icon} loading="lazy" />;
}
