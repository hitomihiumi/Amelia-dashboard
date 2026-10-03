import { ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { UnsavedChangesProvider } from "@/contexts/UnsavedChangesContext";
import { DiscordPreviewProvider } from "@/contexts/DiscordPreviewContext";
import { UnsavedNavigationGuard } from "@/components/layout/UnsavedNavigationGuard";
import { UnsavedBar } from "@/components/layout/UnsavedBar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getGuildAccessForDashboard } from "@/lib/discord/guilds-api";
import { getBotPreviewIdentity } from "@/lib/discord/bot-preview";
import { SettingsBar } from "@/components/dashboard/SettingsBar";

export default async function GuildDashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ guildId: string }>;
}) {
  const resolvedParams = await params;
  const guildId = resolvedParams.guildId;

  const session = await getServerSession(authOptions);

  if (!session?.accessToken) {
    redirect("/");
  }

  let access: Awaited<ReturnType<typeof getGuildAccessForDashboard>>;
  try {
    access = await getGuildAccessForDashboard(session.accessToken, guildId);
  } catch {
    redirect("/dashboard?discord=access");
  }
  if (!access.allowed) {
    redirect("/dashboard");
  }

  const botIdentity = await getBotPreviewIdentity();

  return (
    <UnsavedChangesProvider>
      <DiscordPreviewProvider
        value={{
          ...botIdentity,
          guildId,
          guildName: access.guildName,
          guildIconUrl: access.guildIconUrl,
        }}
      >
        <UnsavedNavigationGuard />
        <AppShell
          sidebar={<SettingsBar access={access} guildId={guildId} />}
          contentMaxWidth="var(--responsive-width-m)"
        >
          {children}
        </AppShell>
        <UnsavedBar />
      </DiscordPreviewProvider>
    </UnsavedChangesProvider>
  );
}
