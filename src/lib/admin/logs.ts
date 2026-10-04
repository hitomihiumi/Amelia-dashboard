import "server-only";

import { RedisService } from "@/lib/db/redis";

export type LogLevel = "error" | "warn" | "info";

export interface LogEntry {
  /** Original Docker timestamp, unique together with the container. */
  id: string;
  ts: number;
  container: string;
  stream: "stdout" | "stderr";
  level: LogLevel;
  message: string;
}

export interface LogQuery {
  /** Only entries at these levels. */
  levels: LogLevel[];
  container?: string;
  search?: string;
  /** Look-back window, 1..24 hours. */
  hours: number;
}

export interface LogsResult {
  entries: LogEntry[];
  /** Containers seen in the window, with the number of errors and warnings each. */
  containers: { name: string; errors: number; warnings: number }[];
  /** Matches before the display limit. */
  total: number;
  truncated: boolean;
  /** False when Redis could not be read at all. */
  available: boolean;
}

/** Sorted set the bot host's log shipper (scripts/log-shipper.mjs) writes to, scored by time. */
const LOG_KEY = "amelia:logs";
const DISPLAY_LIMIT = 500;

export const LOG_WINDOW_HOURS = 24;

function parse(raw: string): LogEntry | null {
  try {
    const value = JSON.parse(raw) as LogEntry;
    return typeof value?.ts === "number" && typeof value.message === "string" ? value : null;
  } catch {
    return null;
  }
}

export async function getLogs(query: LogQuery): Promise<LogsResult> {
  const empty: LogsResult = {
    entries: [],
    containers: [],
    total: 0,
    truncated: false,
    available: false,
  };

  let rows: string[];
  try {
    const client = RedisService.getClient();
    const to = Date.now();
    rows = await client.zrevrangebyscore(LOG_KEY, to, to - LOG_WINDOW_HOURS * 3_600_000);
  } catch (error) {
    console.error("[Logs] Failed to read the logs:", error);
    return empty;
  }

  const since = Date.now() - query.hours * 3_600_000;
  const needle = query.search?.trim().toLowerCase();
  const counts = new Map<string, { errors: number; warnings: number }>();
  const matches: LogEntry[] = [];

  for (const raw of rows) {
    const entry = parse(raw);
    if (!entry || entry.ts < since) continue;

    const count = counts.get(entry.container) ?? { errors: 0, warnings: 0 };
    if (entry.level === "error") count.errors += 1;
    else if (entry.level === "warn") count.warnings += 1;
    counts.set(entry.container, count);

    if (!query.levels.includes(entry.level)) continue;
    if (query.container && entry.container !== query.container) continue;
    if (needle && !entry.message.toLowerCase().includes(needle)) continue;
    matches.push(entry);
  }

  return {
    entries: matches.slice(0, DISPLAY_LIMIT),
    containers: [...counts]
      .map(([name, count]) => ({ name, ...count }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    total: matches.length,
    truncated: matches.length > DISPLAY_LIMIT,
    available: true,
  };
}
