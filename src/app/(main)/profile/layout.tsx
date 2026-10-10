import { Column, Flex } from "@once-ui-system/core";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { UnsavedBar } from "@/components/layout/UnsavedBar";
import { UnsavedNavigationGuard } from "@/components/layout/UnsavedNavigationGuard";
import styles from "@/components/profile/Profile.module.scss";
import { UnsavedChangesProvider } from "@/contexts/UnsavedChangesContext";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** The profile lives in the site's shell (header, footer); only the signed in member sees it. */
export default async function ProfileLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/");

  return (
    <UnsavedChangesProvider>
      <UnsavedNavigationGuard />
      <Flex fillWidth horizontal="center" paddingY="40" paddingX="16">
        <Column maxWidth="l" fillWidth gap="32" className={styles.page}>
          {children}
        </Column>
      </Flex>
      <UnsavedBar />
    </UnsavedChangesProvider>
  );
}
