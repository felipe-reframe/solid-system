"use client";

/**
 * Thin client-side wrapper around NextAuth's SessionProvider.
 * We need this because app/layout.tsx is a Server Component and cannot
 * directly include a Context provider that relies on browser APIs.
 */
import { SessionProvider } from "next-auth/react";

export function SessionWrapper({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
