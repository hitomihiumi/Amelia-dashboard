"use client";

import { useUnsavedChanges } from "@/contexts/UnsavedChangesContext";
import { Flex, Text, Button } from "@once-ui-system/core";
import { useEffect, useState } from "react";

import styles from "./UnsavedBar.module.scss";

export function UnsavedBar() {
  const { isDirty, isSaving, runSave, runCancel, blockedNavigationSignal } = useUnsavedChanges();
  const [attention, setAttention] = useState(false);

  useEffect(() => {
    if (blockedNavigationSignal === 0) return;
    setAttention(true);
    const t = window.setTimeout(() => setAttention(false), 900);
    return () => window.clearTimeout(t);
  }, [blockedNavigationSignal]);

  if (!isDirty) {
    return null;
  }

  return (
    <Flex
      position="fixed"
      bottom="0"
      left="0"
      fillWidth
      padding="24"
      paddingBottom={"xl"}
      horizontal="center"
      zIndex={"9"}
    >
      <Flex
        background="surface"
        border="neutral-strong"
        radius="l"
        padding="8"
        vertical="center"
        horizontal="between"
        gap={"8"}
        fillWidth
        style={{
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
        }}
        s={{
          direction: "column",
        }}
      >
        <Text variant="body-strong-m">You have unsaved changes</Text>

        <Flex gap="16" className={styles.buttonRow}>
          <Button variant="secondary" onClick={runCancel} disabled={isSaving} fillWidth>
            Cancel
          </Button>
          <Button variant="primary" onClick={runSave} disabled={isSaving} fillWidth>
            {isSaving ? "Saving..." : "Save changes"}
          </Button>
        </Flex>
      </Flex>
    </Flex>
  );
}
