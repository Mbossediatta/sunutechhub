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
      className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t bg-background/95 backdrop-blur-md"
      aria-label="Navigation mobile"
    >
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const active = pathname === tab.href;

          if (tab.isCta) {
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-label="Poser une question"
                className="flex h-14 w-14 -mt-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 transition-transform hover:scale-105 active:scale-95"
              >
                <tab.Icon className="h-6 w-6" />
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
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl min-w-[48px] transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.Icon className={cn("h-5 w-5", active && "stroke-[2.5]")} />
              <span className="text-[10px] font-medium">{tab.label}</span>
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
