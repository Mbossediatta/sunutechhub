import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProjectCard } from "@/components/cards/project-card";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Projets" };

type Project = {
  id: string;
  title: string;
  description: string;
  user: { name: string; city: string | null };
  course: { title: string; subjects: string[] };
};

async function getProjects(): Promise<Project[]> {
  const baseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000/api";
  const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/projects/public`, { cache: "no-store" });
  if (!response.ok) throw new Error("Impossible de charger les projets publiés.");
  const result: unknown = await response.json();
  if (!Array.isArray(result)) throw new Error("Réponse de projets invalide.");
  return result as Project[];
}

export default async function ProjetsPage() {
  const projects = await getProjects();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-semibold text-primary">Communauté</p>
          <h1 className="mb-1 font-bricolage text-3xl font-bold">Projets</h1>
          <p className="text-muted-foreground">{projects.length} projet{projects.length === 1 ? "" : "s"} approuvé{projects.length === 1 ? "" : "s"} par la communauté.</p>
        </div>
        <Button className="gap-1.5 rounded-xl shadow-sm shadow-primary/20" asChild>
          <Link href="/projets/nouveau"><Plus className="h-4 w-4" />Partager mon projet</Link>
        </Button>
      </div>

      {projects.length ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              id={project.id}
              title={project.title}
              description={project.description}
              author={project.user}
              courseTitle={project.course.title}
              technologies={project.course.subjects}
            />
          ))}
        </div>
      ) : (
        <div className="py-20 text-center">
          <p className="mb-4 text-5xl">🚀</p>
          <h2 className="mb-2 text-xl font-semibold">Aucun projet publié pour l’instant</h2>
          <p className="mb-6 text-muted-foreground">Les projets apparaîtront ici après validation par l’équipe.</p>
          <Button className="gap-1.5 rounded-xl" asChild>
            <Link href="/projets/nouveau"><Plus className="h-4 w-4" />Partager un projet</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
