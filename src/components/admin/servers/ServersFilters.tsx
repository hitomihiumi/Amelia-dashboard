"use client";

import React, { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Input, Row, SegmentedControl } from "@once-ui-system/core";
import { useT } from "@/i18n/client";
import type { ServerSort, ServerStatus } from "@/lib/admin/servers";

interface Props {
  search: string;
  status: ServerStatus;
  sort: ServerSort;
}

const SORTS: ServerSort[] = ["members", "commands", "messages", "joined", "name"];
const STATUSES: ServerStatus[] = ["active", "left", "all"];

/** Filters live in the URL, so a view can be bookmarked and survives a refresh. */
export function ServersFilters({ search, status, sort }: Props) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const [, startTransition] = useTransition();
  const [query, setQuery] = useState(search);

  useEffect(() => setQuery(search), [search]);

  const apply = (patch: Partial<Props>) => {
    const next = { search, status, sort, ...patch };
    const params = new URLSearchParams();
    if (next.search) params.set("q", next.search);
    if (next.status !== "active") params.set("status", next.status);
    if (next.sort !== "members") params.set("sort", next.sort);
    const text = params.toString();
    startTransition(() =>
      router.replace(text ? `${pathname}?${text}` : pathname, { scroll: false }),
    );
  };

  return (
    <Row wrap gap="12" vertical="center">
      <form
        style={{ flex: 1, minWidth: "16rem" }}
        onSubmit={(event) => {
          event.preventDefault();
          apply({ search: query.trim() });
        }}
      >
        <Input
          id="servers-search"
          label={t("adminServers.filters.search")}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </form>
      <SegmentedControl
        fillWidth={false}
        aria-label={t("adminServers.filters.status")}
        value={status}
        onChange={(value) => apply({ status: value as ServerStatus })}
        buttons={STATUSES.map((value) => ({ value, label: t(`adminServers.status.${value}`) }))}
      />
      <SegmentedControl
        fillWidth={false}
        aria-label={t("adminServers.filters.sort")}
        value={sort}
        onChange={(value) => apply({ sort: value as ServerSort })}
        buttons={SORTS.map((value) => ({ value, label: t(`adminServers.sort.${value}`) }))}
      />
    </Row>
  );
}
