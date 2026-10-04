/**
 * Site administrators, configured through `ADMIN_USER_IDS` — a comma separated
 * list of Discord user ids. They own the news, the incidents and the global
 * configuration; guild permissions have nothing to do with it.
 *
 * Kept free of server-only imports so the auth callbacks can use it too.
 */
export function siteAdminIds(): string[] {
  return (process.env.ADMIN_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export function isSiteAdmin(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return siteAdminIds().includes(userId);
}
