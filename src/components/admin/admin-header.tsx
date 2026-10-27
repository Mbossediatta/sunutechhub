"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const titles: Record<string, string> = {
  "/admin":               "Vue d'ensemble",
  "/admin/statistiques":  "Statistiques",
  "/admin/membres":       "Membres",
  "/admin/questions":     "Questions",
  "/admin/cours":         "Cours",
  "/admin/tarifs":        "Tarifs",
  "/admin/paiements":     "Paiements",
  "/admin/projets":       "Évaluation des projets",
  "/admin/attestations":  "Attestations de réussite",
  "/admin/emplois":       "Offres d'emploi",
  "/admin/evenements":    "Événements",
  "/admin/moderation":    "Modération",
  "/admin/parametres":    "Paramètres",
};

function AdminHeaderInner() {
  const pathname = usePathname();
  const title    = titles[pathname] ?? "Admin";

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-6 shrink-0">
      <h1 className="font-bricolage text-xl font-bold">{title}</h1>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="rounded-xl relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive" />
        </Button>
        <Button variant="ghost" size="icon" className="rounded-xl" aria-label="Rechercher">
          <Search className="h-4 w-4" />
        </Button>
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold ml-2">
          AD
        </div>
      </div>
    </header>
  );
}

export function AdminHeader() {
  return (
    <Suspense fallback={<header className="h-16 border-b bg-card shrink-0" />}>
      <AdminHeaderInner />
    </Suspense>
  );
}
