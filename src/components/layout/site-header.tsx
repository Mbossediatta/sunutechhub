"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Sun, Moon, Search, Menu, X, Code2 } from "lucide-react";
import { useState, useEffect } from "react";
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
  useEffect(() => setMounted(true), []);

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b transition-all duration-200",
      scrolled ? "bg-background/95 backdrop-blur-md shadow-sm" : "bg-background/80 backdrop-blur-sm"
    )}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 flex h-16 items-center gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all group-hover:scale-105 group-hover:shadow-md group-hover:shadow-primary/30">
            <Code2 className="h-4 w-4" />
          </span>
          <span className="font-bricolage text-lg font-bold tracking-tight hidden sm:block">
            Sunu Tech Hub
          </span>
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
          <Button variant="ghost" size="sm" className="rounded-xl" asChild>
            <Link href="/connexion">Connexion</Link>
          </Button>
          <Button size="sm" className="rounded-xl shadow-sm shadow-primary/20" asChild>
            <Link href="/inscription">S&apos;inscrire</Link>
          </Button>
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
          <Button className="w-full rounded-xl" asChild>
            <Link href="/inscription">S&apos;inscrire gratuitement</Link>
          </Button>
          <Button variant="secondary" className="w-full rounded-xl" asChild>
            <Link href="/connexion">Connexion</Link>
          </Button>
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
