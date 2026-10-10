import { Background, Button, Column, RevealFx } from "@once-ui-system/core";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { UnsavedBar } from "@/components/layout/UnsavedBar";
import { UnsavedNavigationGuard } from "@/components/layout/UnsavedNavigationGuard";
import styles from "@/components/profile/Profile.module.scss";
import { UnsavedChangesProvider } from "@/contexts/UnsavedChangesContext";
import { getT } from "@/i18n/server";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProfileLayout({ children }: { children: ReactNode }) {
  const t = await getT();
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/");

  return (
    <UnsavedChangesProvider>
      <UnsavedNavigationGuard />
      <Column fill>
        <Background
          fill
          position="absolute"
          // A soft glow behind the header, not the full-page wash of the server list.
          gradient={{
            display: true,
            opacity: 40,
            x: 50,
            y: 0,
            width: 120,
            height: 50,
            colorStart: "brand-background-strong",
            colorEnd: "static-transparent",
          }}
        />
        <Column
          fillWidth
          minHeight="100vh"
          maxWidth="l"
          padding="24"
          paddingBottom="xl"
          gap="32"
          className={styles.page}
          style={{ marginInline: "auto" }}
        >
          <RevealFx translateY={-0.5} horizontal="start">
            <Button prefixIcon="back" variant="tertiary" href="/">
              {t("common.actions.backToHome")}
            </Button>
          </RevealFx>
          {children}
        </Column>
      </Column>
      <UnsavedBar />
    </UnsavedChangesProvider>
  );
}
