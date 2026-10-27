import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/cards/project-card";
import { mockProjects } from "@/lib/mock-data";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Projets" };

const tags = ["Tous", "Web", "Mobile", "IA", "Données", "DevOps"];

export default function ProjetsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
      {/* En-tête */}
      <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
        <div>
          <p className="text-sm font-semibold text-primary mb-1">Communauté</p>
          <h1 className="font-bricolage text-3xl font-bold mb-1">Projets</h1>
          <p className="text-muted-foreground">{mockProjects.length} projets partagés — sois le prochain !</p>
        </div>
        <Button className="rounded-xl gap-1.5 shadow-sm shadow-primary/20" asChild>
          <Link href="/projets/nouveau"><Plus className="h-4 w-4" />Partager mon projet</Link>
        </Button>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap mb-8">
        {tags.map((t, i) => (
          <button key={t} aria-pressed={i === 0}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
              i === 0
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "border-border text-muted-foreground hover:border-primary hover:text-primary bg-card"
            }`}>
            {t}
          </button>
        ))}
      </div>

      {/* Grille */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {mockProjects.map((p) => <ProjectCard key={p.id} {...p} />)}
      </div>

      {mockProjects.length === 0 && (
        <div className="text-center py-20">
          <p className="text-5xl mb-4">🚀</p>
          <h2 className="font-semibold text-xl mb-2">Aucun projet pour l&apos;instant</h2>
          <p className="text-muted-foreground mb-6">Sois le premier à partager ce que tu construis !</p>
          <Button className="rounded-xl gap-1.5" asChild>
            <Link href="/projets/nouveau"><Plus className="h-4 w-4" />Partager un projet</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
