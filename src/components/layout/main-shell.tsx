"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SiteHeader } from "@/components/layout/site-header";

const standaloneRoutes = ["/connexion", "/inscription"];

export function MainShell({ children, footer }: { children: ReactNode; footer: ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">{children}</main>
        {footer}
      </div>
    }>
      <MainShellContent footer={footer}>{children}</MainShellContent>
    </Suspense>
  );
}

function MainShellContent({ children, footer }: { children: ReactNode; footer: ReactNode }) {
  const pathname = usePathname();
  const isStandalone = standaloneRoutes.includes(pathname);
  const [authenticated, setAuthenticated] = useState(false);

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (!response.ok) {
        setAuthenticated(false);
        return;
      }

      const result: unknown = await response.json();
      setAuthenticated(
        Boolean(
          result &&
          typeof result === "object" &&
          "id" in result &&
          typeof result.id === "string"
        )
      );
    } catch {
      setAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => {
      if (!isStandalone) return refreshSession();
    });
  }, [isStandalone, pathname, refreshSession]);

  useEffect(() => {
    window.addEventListener("sth:auth-changed", refreshSession);
    return () => window.removeEventListener("sth:auth-changed", refreshSession);
  }, [refreshSession]);

  return (
    <div className="flex min-h-screen flex-col">
      {!isStandalone && <SiteHeader />}
      <main className={!isStandalone && authenticated ? "flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0" : "flex-1"}>
        {children}
      </main>
      {footer}
      {!isStandalone && <BottomNav authenticated={authenticated} />}
    </div>
  );
}
