import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PRIVATE_METADATA } from "@/lib/seo/metadata";

// Login and the OAuth popup have nothing to offer a search engine.
export const metadata: Metadata = { ...PRIVATE_METADATA, title: "Login – Amelia" };

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
