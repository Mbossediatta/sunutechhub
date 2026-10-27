"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SiteHeader } from "@/components/layout/site-header";

const standaloneRoutes = ["/connexion", "/inscription"];

export function MainShell({ children, footer }: { children: ReactNode; footer: ReactNode }) {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
        {footer}
        <BottomNav />
      </div>
    }>
      <MainShellContent footer={footer}>{children}</MainShellContent>
    </Suspense>
  );
}

function MainShellContent({ children, footer }: { children: ReactNode; footer: ReactNode }) {
  const pathname = usePathname();
  const isStandalone = standaloneRoutes.includes(pathname);

  return (
    <div className="flex min-h-screen flex-col">
      {!isStandalone && <SiteHeader />}
      <main className={isStandalone ? "flex-1" : "flex-1 pb-20 md:pb-0"}>
        {children}
      </main>
      {footer}
      {!isStandalone && <BottomNav />}
    </div>
  );
}
