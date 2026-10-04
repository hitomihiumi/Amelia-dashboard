import "server-only";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getT } from "@/i18n/server";
import { isSiteAdmin } from "./ids";

export { isSiteAdmin, siteAdminIds } from "./ids";

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
  if (!admin) return { ok: false, error: (await getT())("admin.errors.accessRequired") };

  return { ok: true, admin };
}
