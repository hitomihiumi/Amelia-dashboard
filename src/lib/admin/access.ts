import "server-only";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * Site administrators, configured through `ADMIN_USER_IDS` — a comma separated
 * list of Discord user ids. They own the news, the incidents and the global
 * configuration; guild permissions have nothing to do with it.
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

/** The signed in administrator, or `null` for everyone else. */
export async function getSiteAdmin(): Promise<{ id: string; name: string } | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !isSiteAdmin(session.user.id)) return null;

  return { id: session.user.id, name: session.user.name ?? session.user.id };
}

/** Gate for server actions. Returns the admin, or an error to hand back. */
export async function requireSiteAdmin(): Promise<
  { ok: true; admin: { id: string; name: string } } | { ok: false; error: string }
> {
  const admin = await getSiteAdmin();
  if (!admin) return { ok: false, error: "Administrator access required." };

  return { ok: true, admin };
}
