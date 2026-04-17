"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type UnsavedChangesContextValue = {
  isDirty: boolean;
  setIsDirty: (value: boolean) => void;
  isSaving: boolean;
  setSaveAction: (fn: (() => Promise<void>) | null) => void;
  setCancelAction: (fn: (() => void) | null) => void;
  runSave: () => Promise<void>;
  runCancel: () => void;
  blockedNavigationSignal: number;
  onBlockedNavigationAttempt: () => void;
};

const UnsavedChangesContext = createContext<UnsavedChangesContextValue | null>(null);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [blockedNavigationSignal, setBlockedNavigationSignal] = useState(0);
  const saveRef = useRef<(() => Promise<void>) | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);
  const lastDirtyTargetRef = useRef<HTMLElement | null>(null);

  const setSaveAction = useCallback((fn: (() => Promise<void>) | null) => {
    saveRef.current = fn;
  }, []);

  const setCancelAction = useCallback((fn: (() => void) | null) => {
    cancelRef.current = fn;
  }, []);

  const runSave = useCallback(async () => {
    if (!saveRef.current) return;
    setIsSaving(true);
    try {
      await saveRef.current();
    } finally {
      setIsSaving(false);
    }
  }, []);

  const runCancel = useCallback(() => {
    cancelRef.current?.();
  }, []);

  const onBlockedNavigationAttempt = useCallback(() => {
    setBlockedNavigationSignal((n) => n + 1);
    requestAnimationFrame(() => {
      const el = lastDirtyTargetRef.current;
      if (el?.isConnected) {
        el.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        });
        return;
      }
      const main = document.querySelector("main");
      if (main) {
        main.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }, []);

  useEffect(() => {
    const track = (e: Event) => {
      const t = e.target;
      if (!(t instanceof HTMLElement)) return;
      if (!t.closest("main")) return;
      lastDirtyTargetRef.current = t;
    };
    document.addEventListener("focusin", track, true);
    document.addEventListener("input", track, true);
    document.addEventListener("change", track, true);
    document.addEventListener("pointerdown", track, true);
    return () => {
      document.removeEventListener("focusin", track, true);
      document.removeEventListener("input", track, true);
      document.removeEventListener("change", track, true);
      document.removeEventListener("pointerdown", track, true);
    };
  }, []);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isDirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const value = useMemo(
    () => ({
      isDirty,
      setIsDirty,
      isSaving,
      setSaveAction,
      setCancelAction,
      runSave,
      runCancel,
      blockedNavigationSignal,
      onBlockedNavigationAttempt,
    }),
    [
      isDirty,
      isSaving,
      blockedNavigationSignal,
      setSaveAction,
      setCancelAction,
      runSave,
      runCancel,
      onBlockedNavigationAttempt,
    ],
  );

  return <UnsavedChangesContext.Provider value={value}>{children}</UnsavedChangesContext.Provider>;
}

export function useUnsavedChanges(): UnsavedChangesContextValue {
  const ctx = useContext(UnsavedChangesContext);
  if (!ctx) {
    throw new Error("useUnsavedChanges должен использоваться внутри UnsavedChangesProvider");
  }
  return ctx;
}
