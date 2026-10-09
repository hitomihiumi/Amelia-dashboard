import type { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { UnsavedBar } from "@/components/layout/UnsavedBar";
import { UnsavedNavigationGuard } from "@/components/layout/UnsavedNavigationGuard";
import { ProfileSidebar } from "@/components/profile/ProfileSidebar";
import { UnsavedChangesProvider } from "@/contexts/UnsavedChangesContext";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProfileLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/");

  const { user } = session;

  return (
    <UnsavedChangesProvider>
      <UnsavedNavigationGuard />
      <AppShell
        sidebar={
          <ProfileSidebar
            name={user.name || user.username || "User"}
            username={user.username}
            avatar={user.image ? `${user.image}?size=128` : undefined}
            frame={user.avatarDecoration ? `${user.avatarDecoration}?size=64` : null}
          />
        }
      >
        {children}
      </AppShell>
      <UnsavedBar />
    </UnsavedChangesProvider>
  );
}
