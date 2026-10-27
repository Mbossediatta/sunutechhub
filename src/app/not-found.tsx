import Link from "next/link";
import { Code2, ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 py-20 text-center">
      {/* Logo */}
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-6">
        <Code2 className="h-7 w-7 text-primary" />
      </div>

      {/* Erreur */}
      <span className="font-bricolage text-7xl font-extrabold text-primary/20 mb-4 leading-none">
        404
      </span>

      <h1 className="font-bricolage text-2xl font-bold text-foreground mb-2">
        Page introuvable
      </h1>
      <p className="text-muted-foreground max-w-sm leading-relaxed mb-8">
        Cette page n&apos;existe pas ou a été déplacée. Retourne à l&apos;accueil ou explore la communauté.
      </p>

      <div className="flex flex-wrap gap-3 justify-center">
        <Button asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4" /> Retour à l&apos;accueil
          </Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/questions">
            <Search className="h-4 w-4" /> Explorer les questions
          </Link>
        </Button>
      </div>
    </div>
  );
}
