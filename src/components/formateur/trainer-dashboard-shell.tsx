"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navigation = [
  { href: "/formateur", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/formateur/cours", label: "Mes cours", icon: BookOpen },
];

export function TrainerDashboardShell({
  children,
  name,
  email,
}: {
  children: React.ReactNode;
  name: string;
  email: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");
  const initials = name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const pageTitle =
    pathname === "/formateur"
      ? "Tableau de bord"
      : pathname.startsWith("/formateur/cours")
        ? "Mes cours"
        : "Espace formateur";

  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error("La déconnexion n’a pas abouti. Réessaie.");
      }
      router.replace("/admin/login");
      router.refresh();
    } catch (logoutError) {
      setError(
        logoutError instanceof Error
          ? logoutError.message
          : "Impossible de fermer la session. Réessaie.",
      );
      setLoggingOut(false);
    }
  };

  const navLinks = (mobile = false) =>
    navigation.map((item) => {
      const active =
        item.href === "/formateur"
          ? pathname === item.href
          : pathname.startsWith(item.href);
      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setMenuOpen(false)}
          aria-current={active ? "page" : undefined}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
            active
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
            mobile && "min-h-12",
          )}
        >
          <item.icon className="h-4 w-4 shrink-0" />
          {item.label}
        </Link>
      );
    });

  return (
    <div className="min-h-screen bg-muted/30 md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-card md:flex">
        <Link
          href="/formateur"
          className="flex h-16 items-center gap-3 border-b px-5"
          aria-label="Accueil de l’espace formateur"
        >
          <Image
            src="/logo-sunutech.png"
            alt=""
            width={40}
            height={40}
            className="h-9 w-9 rounded-lg object-contain"
          />
          <span className="font-bricolage text-sm font-bold">
            Sunu Tech Hub
          </span>
        </Link>
        <nav aria-label="Navigation formateur" className="flex-1 space-y-1 p-3">
          {navLinks()}
        </nav>
        <div className="border-t p-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {initials || <GraduationCap className="h-5 w-5" />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {email || "Formateur"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between gap-3 border-b bg-card px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 md:hidden"
              aria-label={menuOpen ? "Fermer le menu" : "Ouvrir le menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </Button>
            <div className="min-w-0">
              <p className="hidden text-xs font-semibold uppercase tracking-wide text-primary sm:block">
                Espace formateur
              </p>
              <h1 className="truncate font-bricolage text-base font-bold sm:text-lg">
                {pageTitle}
              </h1>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <div className="hidden min-w-0 text-right sm:block">
              <p className="max-w-48 truncate text-sm font-semibold">{name}</p>
              <p className="max-w-48 truncate text-xs text-muted-foreground">
                {email}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              disabled={loggingOut}
              onClick={() => void logout()}
            >
              {loggingOut ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">
                {loggingOut ? "Déconnexion…" : "Quitter"}
              </span>
            </Button>
          </div>
          {error && (
            <p
              role="alert"
              className="absolute right-4 top-full z-10 mt-2 max-w-[calc(100vw-2rem)] rounded-xl border border-accent/20 bg-card px-3 py-2 text-sm text-accent shadow-md sm:right-6"
            >
              {error}
            </p>
          )}
        </header>

        {menuOpen && (
          <nav
            aria-label="Navigation mobile formateur"
            className="space-y-1 border-b bg-card p-3 md:hidden"
          >
            {navLinks(true)}
            <div className="mt-2 border-t px-3 pt-3">
              <p className="text-sm font-semibold">{name}</p>
              <p className="break-all text-xs text-muted-foreground">
                {email}
              </p>
            </div>
          </nav>
        )}

        <main className="min-w-0 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
