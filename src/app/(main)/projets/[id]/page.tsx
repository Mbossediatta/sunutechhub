import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, Rocket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Metadata } from "next";

export const instant = false;

type Project = {
  id: string;
  title: string;
  description: string;
  link: string | null;
  submittedAt: string;
  user: { id: string; name: string; city: string | null };
  course: { id: string; title: string; subjects: string[] };
};

async function getProject(id: string): Promise<Project | null> {
  const baseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000/api";
  const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/projects/public/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Impossible de charger ce projet.");
  return await response.json() as Project;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const project = await getProject(id);
  return { title: project?.title ?? "Projet" };
}

export default async function ProjetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/projets" className="group mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Retour aux projets
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-6 flex h-48 items-center justify-center overflow-hidden rounded-2xl border bg-gradient-to-br from-accent/15 via-primary/8 to-background sm:h-64">
            <Rocket className="h-20 w-20 text-primary/50" />
          </div>
          <div className="mb-3 flex flex-wrap gap-2">
            {project.course.subjects.map((subject) => <Badge key={subject} variant="outline">{subject}</Badge>)}
          </div>
          <h1 className="mb-3 break-words font-bricolage text-2xl font-bold md:text-3xl">{project.title}</h1>
          <p className="mb-8 break-words whitespace-pre-wrap leading-relaxed text-muted-foreground">{project.description}</p>
          <Card>
            <CardContent className="p-5">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">Projet réalisé dans le cadre du cours</p>
              <Link href={`/cours/${project.course.id}`} className="font-medium hover:text-primary">{project.course.title}</Link>
            </CardContent>
          </Card>
        </div>

        <aside>
          <Card className="sticky top-24">
            <CardContent className="flex flex-col gap-4 p-6">
              <div className="border-b pb-4">
                <p className="mb-1 text-xs text-muted-foreground">Auteur</p>
                <Link href={`/profil/${project.user.id}`} className="font-semibold hover:text-primary">{project.user.name}</Link>
                {project.user.city && <p className="text-xs text-muted-foreground">{project.user.city}</p>}
              </div>
              <p className="text-xs text-muted-foreground">
                Partagé le {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(project.submittedAt))}
              </p>
              {project.link && (
                <Button className="w-full gap-2 rounded-xl" asChild>
                  <a href={project.link} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />Voir le projet</a>
                </Button>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
