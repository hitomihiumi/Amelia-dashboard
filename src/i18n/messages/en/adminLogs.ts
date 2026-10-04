export const adminLogs = {
  title: "Logs",
  description: "Warnings and errors from every container over the last 24 hours.",
  level: { error: "Errors", warn: "Warnings" },
  summary: {
    errors: "{count, plural, one {# error} other {# errors}}",
    warnings: "{count, plural, one {# warning} other {# warnings}}",
    window: "in the last {hours} h",
  },
  containers: "Containers",
  count: {
    errors: "{count, plural, one {# error} other {# errors}}",
    warnings: "{count, plural, one {# warning} other {# warnings}}",
  },
  consoleCount: "Showing {shown} of {total}",
  consoleLive: "updates every 15 s",
  filters: {
    level: "Severity",
    all: "All",
    period: "Period",
    hours: "{hours} h",
    allContainers: "All containers",
    search: "Search in messages (Enter)",
  },
  live: { on: "Auto-refresh: on", off: "Auto-refresh: off" },
  refresh: "Refresh",
  empty: {
    title: "No warnings or errors",
    text: "Nothing matches the filters for this period. Either all is well, or the log shipper is not running.",
  },
  unavailable: {
    title: "Logs are unavailable",
    text: "Redis could not be read. Check REDIS_URL and that the logs service is running.",
  },
  truncated: "Showing the latest {shown} of {total} entries. Narrow the filters to see the rest.",
};
