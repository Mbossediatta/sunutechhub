"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, MessageSquare, BookOpen,
  Briefcase, Flag, BarChart2, Settings, Code2,
  CalendarDays, ChevronRight, BadgeDollarSign,
  CreditCard, ClipboardCheck, ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  {
    label: "Principal",
    items: [
      { href: "/admin",            label: "Vue d'ensemble",  icon: LayoutDashboard },
      { href: "/admin/statistiques",label: "Statistiques",  icon: BarChart2 },
    ],
  },
  {
    label: "Contenu",
    items: [
      { href: "/admin/membres",    label: "Membres",         icon: Users },
      { href: "/admin/questions",  label: "Questions",       icon: MessageSquare },
      { href: "/admin/cours",      label: "Cours",           icon: BookOpen },
      { href: "/admin/tarifs",     label: "Tarifs",          icon: BadgeDollarSign },
      { href: "/admin/paiements",  label: "Paiements",       icon: CreditCard },
      { href: "/admin/projets",    label: "Projets",          icon: ClipboardCheck },
      { href: "/admin/attestations",label: "Attestations",    icon: ScrollText },
      { href: "/admin/emplois",    label: "Offres emploi",   icon: Briefcase },
      { href: "/admin/evenements", label: "Événements",      icon: CalendarDays },
    ],
  },
  {
    label: "Modération",
    items: [
      { href: "/admin/moderation", label: "Signalements",    icon: Flag, badge: 3 },
    ],
  },
  {
    label: "Système",
    items: [
      { href: "/admin/parametres", label: "Paramètres",      icon: Settings },
    ],
  },
];

function AdminSidebarInner() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 flex-col border-r bg-card shrink-0 h-screen sticky top-0">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-5 border-b">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Code2 className="h-4 w-4" />
        </span>
        <div>
          <p className="font-bricolage font-bold text-sm leading-tight">Sunu Tech Hub</p>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">Administration</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {nav.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="px-3 mb-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              {group.label}
            </p>
            {group.items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 mb-0.5",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}>
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {"badge" in item && item.badge && (
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                      active ? "bg-white/20 text-white" : "bg-destructive/10 text-destructive"
                    )}>
                      {item.badge}
                    </span>
                  )}
                  {active && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Profil admin */}
      <div className="border-t p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
            AD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate">Admin Sunu</p>
            <p className="text-[10px] text-muted-foreground">Administrateur</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function AdminSidebar() {
  return (
    <Suspense fallback={<aside className="hidden md:flex w-64 border-r bg-card h-screen" />}>
      <AdminSidebarInner />
    </Suspense>
  );
}
