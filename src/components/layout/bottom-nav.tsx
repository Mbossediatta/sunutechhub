"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageCircle, BookOpen, User, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/",          label: "Accueil",   Icon: Home },
  { href: "/questions", label: "Questions", Icon: MessageCircle },
  { href: "/questions/nouveau", label: "", Icon: Plus, isCta: true },
  { href: "/cours",     label: "Cours",     Icon: BookOpen },
  { href: "/profil",    label: "Profil",    Icon: User },
];

function BottomNavInner({ authenticated }: { authenticated: boolean }) {
  const pathname = usePathname();

  if (!authenticated) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
      aria-label="Navigation mobile"
    >
      <div className="mx-auto grid h-14 w-full max-w-lg grid-cols-5 items-center px-2">
        {tabs.map((tab) => {
          const active = pathname === tab.href;

          if (tab.isCta) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-label="Poser une question"
                className="mx-auto flex h-11 w-11 -translate-y-2 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 transition-transform hover:scale-105 active:scale-95"
              >
                <tab.Icon className="h-4 w-4" />
              </Link>
            );
          }

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={tab.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-2 transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.Icon className={cn("h-4 w-4", active && "stroke-[2.5]")} />
              <span className="text-[9px] font-medium leading-tight">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function BottomNav({ authenticated }: { authenticated: boolean }) {
  return (
    <Suspense fallback={null}>
      <BottomNavInner authenticated={authenticated} />
    </Suspense>
  );
}
