import Link from "next/link";
import { Code2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const links = {
  Plateforme: [
    { label: "Questions",   href: "/questions" },
    { label: "Cours",       href: "/cours" },
    { label: "Projets",     href: "/projets" },
    { label: "Emplois",     href: "/emplois" },
    { label: "Événements",  href: "/evenements" },
  ],
  Communauté: [
    { label: "À propos",    href: "/a-propos" },
    { label: "Règles",      href: "/regles" },
    { label: "Mentors",     href: "/mentors" },
  ],
  Compte: [
    { label: "Inscription", href: "/inscription" },
    { label: "Connexion",   href: "/connexion" },
    { label: "Tarifs des cours", href: "/tarifs" },
  ],
};

export function SiteFooter() {
  return (
    <footer className="border-t bg-muted/40">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-10 pb-24 md:py-12">
        <div className="grid grid-cols-2 gap-x-8 gap-y-9 sm:grid-cols-4 sm:gap-10">
          <div className="col-span-2 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Code2 className="h-4 w-4" />
              </span>
              <span className="font-bricolage font-bold">Sunu Tech Hub</span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Apprendre, partager, construire ensemble. La communauté informatique du Sénégal.
            </p>
          </div>
          {Object.entries(links).map(([group, items]) => (
            <div key={group}>
              <h4 className="font-semibold text-sm mb-4">{group}</h4>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href}
                      className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <Separator className="my-8" />
        <div className="flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Sunu Tech Hub. Fait avec 🇸🇳 au Sénégal.</p>
          <div className="flex gap-4">
            <Link href="/confidentialite" className="hover:text-primary transition-colors">Confidentialité</Link>
            <Link href="/conditions" className="hover:text-primary transition-colors">Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
