import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MessageSquare, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { mockProjects } from "@/lib/mock-data";
import type { Metadata } from "next";

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  const p = mockProjects.find((x) => x.id === params.id);
  return { title: p?.title ?? "Projet" };
}

const mockComments = [
  { id: "1", author: { name: "Fatou Sow", city: "Dakar" },   text: "Super projet ! J'adore l'idée de permettre aux artisans de vendre directement. Est-ce que tu utilises un système de paiement mobile ?", time: "il y a 2h" },
  { id: "2", author: { name: "Ibrahima Ndiaye", city: "Thiès" }, text: "Bon travail. Pour le backend, tu as pensé à utiliser NestJS ? Ça s'intégrerait bien avec Flutter.", time: "il y a 5h" },
];

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

const emojis = ["🚀", "💡", "🛠️", "⚡", "🌍"];

export default function ProjetDetailPage({ params }: { params: { id: string } }) {
  const project = mockProjects.find((p) => p.id === params.id);
  if (!project) notFound();

  const emoji = emojis[parseInt(project.id) % emojis.length];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <Link href="/projets" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 group transition-colors">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        Retour aux projets
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Contenu principal */}
        <div className="lg:col-span-2">
          {/* Thumbnail */}
          <div className="h-48 sm:h-64 rounded-2xl bg-gradient-to-br from-accent/15 via-primary/8 to-background flex items-center justify-center mb-6 border overflow-hidden">
            <span className="text-8xl">{emoji}</span>
          </div>

          {/* Titre + badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            {project.technologies.map((t) => (
              <Badge key={t} variant="outline">{t}</Badge>
            ))}
          </div>
          <h1 className="font-bricolage text-2xl md:text-3xl font-bold mb-3">{project.title}</h1>
          <p className="text-muted-foreground leading-relaxed mb-8">{project.description}</p>

          {/* Description longue (simulée) */}
          <div className="prose prose-sm max-w-none text-foreground space-y-4 mb-8">
            <h2 className="font-bricolage text-lg font-bold">À propos du projet</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ce projet a été développé pour répondre à un besoin réel identifié au Sénégal. 
              L&apos;objectif principal est de simplifier l&apos;accès au marché numérique pour les artisans locaux 
              qui n&apos;ont pas les ressources pour créer leur propre présence en ligne.
            </p>
            <h2 className="font-bricolage text-lg font-bold">Technologies utilisées</h2>
            <div className="flex flex-wrap gap-2">
              {project.technologies.map((t) => (
                <span key={t} className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">{t}</span>
              ))}
            </div>
          </div>

          {/* Commentaires */}
          <div>
            <h2 className="font-bricolage text-xl font-bold mb-5 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              {mockComments.length} retour{mockComments.length > 1 ? "s" : ""}
            </h2>

            <div className="flex flex-col gap-4 mb-6">
              {mockComments.map((c) => (
                <div key={c.id} className="rounded-2xl border bg-card p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                      {getInitials(c.author.name)}
                    </span>
                    <div>
                      <p className="text-sm font-semibold">{c.author.name}</p>
                      <p className="text-xs text-muted-foreground">{c.author.city} · {c.time}</p>
                    </div>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{c.text}</p>
                </div>
              ))}
            </div>

            {/* Zone commentaire */}
            <div className="rounded-2xl border bg-card p-5">
              <h3 className="font-semibold text-sm mb-3">Laisser un retour</h3>
              <textarea
                placeholder="Partage ton avis ou tes suggestions sur ce projet…"
                rows={3}
                className="w-full rounded-xl border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none transition-all"
              />
              <div className="flex justify-end mt-3">
                <Button size="sm" className="rounded-xl">Publier</Button>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardContent className="p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3 pb-4 border-b">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                  {getInitials(project.author.name)}
                </span>
                <div>
                  <p className="font-semibold text-sm">{project.author.name}</p>
                  <p className="text-xs text-muted-foreground">{project.author.city}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Retours</span>
                  <span className="font-semibold">{project.feedback}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Technologies</span>
                  <span className="font-semibold">{project.technologies.length}</span>
                </div>
              </div>

              <Button className="w-full rounded-xl gap-2">
                <ExternalLink className="h-4 w-4" /> Voir la démo
              </Button>
              <Button variant="secondary" className="w-full rounded-xl" asChild>
                <Link href={`/profil/1`}>Voir le profil</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
