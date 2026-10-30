import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaginatedProjectGrid } from "@/components/cards/paginated-project-grid";
import { PUBLIC_CACHE_TAGS } from "@/lib/public-cache";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Projets" };
export const instant = false;

type Project = {
  id: string;
  title: string;
  description: string;
  imageUrls: string[];
  technologies: string[];
  _count: { likes: number; comments: number };
  user: { name: string; city: string | null };
};

async function getProjects(): Promise<Project[]> {
  const baseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000/api";
  const response = await fetch(
    `${baseUrl.replace(/\/+$/, "")}/showcase-projects`,
    { next: { revalidate: 30, tags: [PUBLIC_CACHE_TAGS.projects] } },
  );
  if (!response.ok)
    throw new Error("Impossible de charger les projets de la communauté.");
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
          <h1 className="mb-1 font-bricolage text-2xl font-bold sm:text-3xl">
            Projets
          </h1>
          <p className="text-muted-foreground">
            {projects.length} projet{projects.length === 1 ? "" : "s"} partagé
            {projects.length === 1 ? "" : "s"} par la communauté.
          </p>
        </div>
        <Button
          className="max-w-full gap-1.5 whitespace-normal rounded-xl shadow-sm shadow-primary/20"
          asChild
        >
          <Link href="/projets/nouveau">
            <Plus className="h-4 w-4" />
            Partager mon projet
          </Link>
        </Button>
      </div>

      {projects.length ? (
        <PaginatedProjectGrid projects={projects} />
      ) : (
        <div className="py-20 text-center">
          <p className="mb-4 text-5xl">🚀</p>
          <h2 className="mb-2 text-xl font-semibold">
            Aucun projet partagé pour l’instant
          </h2>
          <p className="mb-6 text-muted-foreground">
            Présente ton projet à la communauté et ouvre les échanges.
          </p>
          <Button className="gap-1.5 rounded-xl" asChild>
            <Link href="/projets/nouveau">
              <Plus className="h-4 w-4" />
              Partager un projet
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
