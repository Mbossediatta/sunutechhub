"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Calendar, CheckCircle2, FolderGit2, MapPin, MessageSquare, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Profile = {
  id: string;
  name: string;
  email: string;
  city: string | null;
  bio: string | null;
  interests: string[];
  createdAt: string;
  registrations: {
    id: string;
    endsAt: string | null;
    course: { id: string; title: string; isFree: boolean };
  }[];
  _count: { questions: number; answers: number; projects: number };
};

function getInitials(name: string) {
  return name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();
}

export default function ProfilPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        const result: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const message = result && typeof result === "object" && "message" in result && typeof result.message === "string"
            ? result.message
            : "Impossible de charger votre profil.";
          throw new Error(message);
        }
        setProfile(result as Profile);
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Impossible de charger votre profil."));
  }, []);

  if (error) return <p role="alert" className="mx-auto max-w-4xl px-4 py-10 text-sm text-destructive">{error}</p>;
  if (!profile) return <p className="mx-auto max-w-4xl px-4 py-10 text-sm text-muted-foreground">Chargement du profil…</p>;

  const stats = [
    { icon: MessageSquare, value: profile._count.questions, label: "Questions" },
    { icon: CheckCircle2, value: profile._count.answers, label: "Réponses" },
    { icon: FolderGit2, value: profile._count.projects, label: "Projets" },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col items-start gap-5 sm:flex-row">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary/10 font-bricolage text-2xl font-bold text-primary">
              {getInitials(profile.name)}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="mb-2 font-bricolage text-2xl font-bold">{profile.name}</h1>
              <div className="mb-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                {profile.city && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{profile.city}</span>}
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Membre depuis {new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(new Date(profile.createdAt))}</span>
              </div>
              <p className="mb-4 whitespace-pre-wrap text-sm">{profile.bio || "Aucune biographie renseignée."}</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.interests.map((interest) => <Badge key={interest} variant="outline">{interest}</Badge>)}
              </div>
            </div>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/profil/modifier"><Pencil className="h-3.5 w-3.5" /> Modifier</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex flex-col items-center gap-2 p-5 text-center">
              <stat.icon className="h-5 w-5 text-primary" />
              <span className="font-bricolage text-2xl font-extrabold text-primary">{stat.value}</span>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-5 font-bricolage text-lg font-bold">Mes cours</h2>
          {profile.registrations.length ? (
            <div className="flex flex-col gap-3">
              {profile.registrations.map(({ id, endsAt, course }) => {
                const active = !endsAt || new Date(endsAt) > new Date();
                return (
                <Link key={id} href={`/cours/${course.id}`} className="flex items-center justify-between gap-3 rounded-xl border p-4 hover:border-primary">
                  <span className="text-sm font-medium">{course.title}</span>
                  <Badge variant={active ? "secondary" : "outline"}>{active ? "Actif" : "Expiré"}</Badge>
                </Link>
                );
              })}
            </div>
          ) : <p className="text-sm text-muted-foreground">Aucun cours actif pour le moment.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
