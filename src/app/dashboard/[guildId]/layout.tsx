import { ReactNode } from "react";
import { Flex } from "@once-ui-system/core";
import { UnsavedChangesProvider } from "@/contexts/UnsavedChangesContext";
import { UnsavedNavigationGuard } from "@/components/layout/UnsavedNavigationGuard";
import { UnsavedBar } from "@/components/layout/UnsavedBar";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getGuildAccessForDashboard } from "@/lib/discord/guilds-api";
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
    redirect("/dashboard?discord=rate_limit");
  }
  if (!access.allowed) {
    redirect("/dashboard");
  }

  return (
    <UnsavedChangesProvider>
      <UnsavedNavigationGuard />
      <Flex fillWidth fillHeight direction={"row"} m={{ direction: "column" }}>
        <SettingsBar access={access} guildId={guildId} />
        <Flex fill horizontal={"center"}>
          <Flex direction="column" fillWidth padding="24" overflow="auto" maxWidth={"m"}>
            {children}
          </Flex>
        </Flex>
      </Flex>
      <UnsavedBar />
    </UnsavedChangesProvider>
  );
}
