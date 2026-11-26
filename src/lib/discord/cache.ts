import "server-only";

/**
 * Tiny in-memory TTL cache with request coalescing for Discord reads.
 *
 * The dashboard asks Discord for the same guild roles / channels on every page view and
 * again after every save (`revalidatePath` re-renders the page). Those answers change
 * rarely, so a short TTL removes most round trips while staying fresh enough for editing.
 * Concurrent callers share one in-flight request. Errors are never cached.
 */

type Entry = { expires: number; value: unknown };

const g = globalThis as unknown as {
  discordTtlCache?: Map<string, Entry>;
  discordInflight?: Map<string, Promise<unknown>>;
};

const store = g.discordTtlCache ?? (g.discordTtlCache = new Map<string, Entry>());
const inflight = g.discordInflight ?? (g.discordInflight = new Map<string, Promise<unknown>>());

const MAX_ENTRIES = 500;

function prune(now: number) {
  if (store.size < MAX_ENTRIES) return;
  for (const [key, entry] of store) {
    if (entry.expires <= now) store.delete(key);
  }
  // Still full of live entries: drop the oldest inserted ones.
  while (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}

export async function cachedDiscord<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.expires > now) return hit.value as T;

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const p = load()
    .then((value) => {
      prune(Date.now());
      store.set(key, { expires: Date.now() + ttlMs, value });
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, p);
  return p;
}

/** Forget every cached entry whose key starts with `prefix` (after a change made through the dashboard). */
export function invalidateDiscordCache(prefix: string) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}
