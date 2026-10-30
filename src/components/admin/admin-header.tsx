"use client";

import { Suspense } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, LoaderCircle, LogOut, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

const titles: Record<string, string> = {
  "/admin": "Vue d'ensemble",
  "/admin/statistiques": "Statistiques",
  "/admin/membres": "Membres",
  "/admin/questions": "Questions",
  "/admin/cours": "Cours",
  "/admin/tarifs": "Tarifs",
  "/admin/paiements": "Paiements",
  "/admin/projets": "Évaluation des projets",
  "/admin/attestations": "Attestations de réussite",
  "/admin/emplois": "Offres d'emploi",
  "/admin/evenements": "Événements",
  "/admin/moderation": "Modération",
  "/admin/parametres": "Paramètres",
  "/admin/securite": "Sécurité",
};

function AdminHeaderInner() {
  const pathname = usePathname();
  const router = useRouter();
  const title = titles[pathname] ?? "Admin";
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error("La déconnexion n’a pas abouti. Réessaie.");
      }
      router.replace("/admin/login");
      router.refresh();
    } catch (error) {
      setLogoutError(
        error instanceof Error
          ? error.message
          : "Impossible de fermer la session. Réessaie.",
      );
      setLoggingOut(false);
    }
  };

  return (
    <header className="relative flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 sm:px-6">
      <h1
        title={title}
        className="min-w-0 flex-1 truncate font-bricolage text-base font-bold sm:text-xl"
      >
        {title}
      </h1>
      <div className="ml-2 flex shrink-0 items-center gap-1 sm:gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="relative hidden rounded-xl sm:inline-flex"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden rounded-xl sm:inline-flex"
          aria-label="Rechercher"
        >
          <Search className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="ml-1 rounded-xl"
          onClick={() => void logout()}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">
            {loggingOut ? "Déconnexion…" : "Se déconnecter"}
          </span>
        </Button>
      </div>
      {logoutError && (
        <p
          role="alert"
          className="absolute right-4 top-full z-10 mt-2 rounded-xl border border-accent/20 bg-card px-3 py-2 text-sm text-accent shadow-md sm:right-6"
        >
          {logoutError}
        </p>
      )}
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
