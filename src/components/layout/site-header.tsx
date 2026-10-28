"use client";

import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon, Search, Menu, X, LogOut, UserRound } from "lucide-react";
import { useCallback, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/questions",  label: "Questions" },
  { href: "/cours",      label: "Cours" },
  { href: "/projets",    label: "Projets" },
  { href: "/emplois",    label: "Emplois" },
  { href: "/evenements", label: "Événements" },
];

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    void Promise.resolve().then(() => setMounted(true));
  }, []);

  if (!mounted) return <div className="h-10 w-10 rounded-xl opacity-0" aria-hidden />;

  return (
    <Button
      variant="ghost" size="icon" className="rounded-xl"
      aria-label={resolvedTheme === "dark" ? "Thème clair" : "Thème sombre"}
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
    >
      {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

// Composant interne qui utilise usePathname
function HeaderNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<{ id: string; name: string; role: "MEMBER" | "ADMIN" } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState("");
  const [branding, setBranding] = useState({
    platformName: "Sunu Tech Hub",
    logoUrl: "/logo-sunutech.png",
  });
  const [announcement, setAnnouncement] = useState<{
    id: string;
    title: string;
    body: string;
    link: string | null;
  } | null>(null);

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/me", { cache: "no-store" });
      if (response.status === 401) {
        setUser(null);
        setAuthError("");
      } else if (!response.ok) {
        setAuthError("La session n’a pas pu être vérifiée.");
      } else {
        const result: unknown = await response.json();
        if (
          !result ||
          typeof result !== "object" ||
          !("id" in result) ||
          typeof result.id !== "string" ||
          !("name" in result) ||
          typeof result.name !== "string" ||
          !("role" in result) ||
          (result.role !== "MEMBER" && result.role !== "ADMIN")
        ) {
          throw new Error("Réponse de session invalide.");
        }
        setUser({ id: result.id, name: result.name, role: result.role });
        setAuthError("");
      }
    } catch {
      setAuthError("La session n’a pas pu être vérifiée.");
    } finally {
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(refreshSession);
  }, [pathname, refreshSession]);

  useEffect(() => {
    void Promise.all([
      fetch("/api/platform-settings", { cache: "no-store" }).then(async (response) => {
        if (!response.ok) return;
        const result: unknown = await response.json();
        if (result && typeof result === "object") {
          const settings = result as { platformName?: unknown; logoUrl?: unknown };
          setBranding({
            platformName: typeof settings.platformName === "string" && settings.platformName
              ? settings.platformName
              : "Sunu Tech Hub",
            logoUrl: typeof settings.logoUrl === "string" && settings.logoUrl
              ? settings.logoUrl
              : "/logo-sunutech.png",
          });
        }
      }),
      fetch("/api/announcements", { cache: "no-store" }).then(async (response) => {
        if (!response.ok) return;
        const result: unknown = await response.json();
        if (Array.isArray(result) && result.length > 0) {
          const first = result[0];
          if (
            first &&
            typeof first === "object" &&
            "id" in first &&
            typeof first.id === "string" &&
            "title" in first &&
            typeof first.title === "string" &&
            "body" in first &&
            typeof first.body === "string" &&
            "link" in first &&
            (typeof first.link === "string" || first.link === null)
          ) {
            setAnnouncement({
              id: first.id,
              title: first.title,
              body: first.body,
              link: first.link,
            });
          }
        }
      }),
    ]).catch(() => {
      // The public header keeps its local branding if the settings service is unavailable.
    });
  }, []);

  useEffect(() => {
    const handleAuthChange = () => void refreshSession();
    window.addEventListener("sth:auth-changed", handleAuthChange);
    return () => window.removeEventListener("sth:auth-changed", handleAuthChange);
  }, [refreshSession]);

  const signOut = async () => {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("La déconnexion a échoué.");
      setUser(null);
      setMenuOpen(false);
      router.replace("/");
      router.refresh();
    } catch {
      setAuthError("Impossible de fermer la session. Réessaie.");
    }
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => setMenuOpen(false));
  }, [pathname]);

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b transition-all duration-200",
      scrolled ? "bg-background/95 backdrop-blur-md shadow-sm" : "bg-background/80 backdrop-blur-sm"
    )}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 flex h-16 items-center gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <Image
            src={branding.logoUrl}
            alt={`${branding.platformName} — Apprendre, partager, construire ensemble`}
            width={200}
            height={50}
            unoptimized
            priority
            className="h-10 w-auto rounded-lg bg-white object-contain transition-transform group-hover:scale-[1.02]"
          />
        </Link>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-0.5 ml-4" aria-label="Navigation principale">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href}
              className={cn(
                "relative px-3.5 py-2 rounded-xl text-sm font-medium transition-colors duration-150",
                pathname === l.href
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}>
              {l.label}
              {pathname === l.href && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          ))}
        </nav>

        <div className="flex-1" />

        {/* Actions desktop */}
        <div className="hidden md:flex items-center gap-1.5">
          <Button variant="ghost" size="icon" className="rounded-xl" aria-label="Rechercher">
            <Search className="h-4 w-4" />
          </Button>
          <ThemeToggle />
          <div className="w-px h-5 bg-border mx-1" />
          {authChecked && !authError && (user ? (
            <>
              {user.role === "ADMIN" && (
                <Button variant="ghost" size="sm" className="rounded-xl" asChild>
                  <Link href="/admin">Administration</Link>
                </Button>
              )}
              <Button variant="secondary" size="sm" className="rounded-xl" asChild>
                <Link href="/profil"><UserRound className="mr-1.5 h-4 w-4" />{user.name}</Link>
              </Button>
              <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => void signOut()} aria-label="Se déconnecter">
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : authChecked && !authError ? (
            <>
              <Button variant="ghost" size="sm" className="rounded-xl" asChild>
                <Link href="/connexion">Connexion</Link>
              </Button>
              <Button size="sm" className="rounded-xl shadow-sm shadow-primary/20" asChild>
                <Link href="/inscription">S&apos;inscrire</Link>
              </Button>
            </>
          ) : null)}
        </div>

        {/* Actions mobile */}
        <div className="flex md:hidden items-center gap-1">
          <ThemeToggle />
          <Button variant="ghost" size="icon" className="rounded-xl"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? "Fermer" : "Menu"}
            aria-expanded={menuOpen}>
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Menu mobile */}
      {menuOpen && (
        <div className="md:hidden border-t bg-background px-4 py-4 flex flex-col gap-1 shadow-lg">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href}
              className={cn(
                "px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                pathname === l.href ? "bg-primary/10 text-primary font-semibold" : "text-foreground hover:bg-muted"
              )}>
              {l.label}
            </Link>
          ))}
          <div className="border-t my-2" />
          {authChecked && !authError && (user ? (
            <>
              <Link href="/profil" className="rounded-xl px-4 py-3 text-sm font-medium hover:bg-muted">
                <UserRound className="mr-2 inline h-4 w-4" />Mon profil — {user.name}
              </Link>
              {user.role === "ADMIN" && (
                <Link href="/admin" className="rounded-xl px-4 py-3 text-sm font-medium hover:bg-muted">Administration</Link>
              )}
              <Button variant="secondary" className="w-full rounded-xl" onClick={() => void signOut()}>
                <LogOut className="mr-2 h-4 w-4" />Se déconnecter
              </Button>
            </>
          ) : authChecked && !authError ? (
            <>
              <Button className="w-full rounded-xl" asChild>
                <Link href="/inscription">S&apos;inscrire gratuitement</Link>
              </Button>
              <Button variant="secondary" className="w-full rounded-xl" asChild>
                <Link href="/connexion">Connexion</Link>
              </Button>
            </>
          ) : null)}
          {authError && <p role="status" className="px-4 text-xs text-muted-foreground">{authError}</p>}
        </div>
      )}
      {announcement && (
        <div className="border-t bg-primary px-4 py-2 text-center text-sm text-primary-foreground">
          {announcement.link ? (
            <a href={announcement.link} className="font-medium underline-offset-4 hover:underline">
              <span className="font-semibold">{announcement.title} :</span> {announcement.body}
            </a>
          ) : (
            <p>
              <span className="font-semibold">{announcement.title} :</span> {announcement.body}
            </p>
          )}
        </div>
      )}
    </header>
  );
}

// Export principal wrappé dans Suspense
export function SiteHeader() {
  return (
    <Suspense fallback={
      <header className="sticky top-0 z-50 w-full border-b bg-background/80 h-16" />
    }>
      <HeaderNav />
    </Suspense>
  );
}
