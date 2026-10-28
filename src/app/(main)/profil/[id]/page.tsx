import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar, CheckCircle2, FolderGit2, MapPin, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Metadata } from "next";

type PublicProfile = {
  id: string;
  name: string;
  city: string | null;
  bio: string | null;
  interests: string[];
  createdAt: string;
  registrations: { id: string; course: { id: string; title: string } }[];
  _count: { questions: number; answers: number; projects: number };
};

async function getProfile(id: string): Promise<PublicProfile | null> {
  const baseUrl = process.env.BACKEND_API_URL ?? "http://localhost:4000/api";
  const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/auth/users/${encodeURIComponent(id)}`, { cache: "no-store" });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Impossible de charger ce profil.");
  return await response.json() as PublicProfile;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const profile = await getProfile(id);
  return { title: profile ? `Profil de ${profile.name}` : "Profil" };
}

export default async function ProfilPublicPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) notFound();

  const stats = [
    { icon: MessageSquare, value: profile._count.questions, label: "Questions" },
    { icon: CheckCircle2, value: profile._count.answers, label: "Réponses" },
    { icon: FolderGit2, value: profile._count.projects, label: "Projets" },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/questions" className="group mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />Retour
      </Link>

      <Card className="mb-6">
        <CardContent className="flex flex-col items-start gap-5 p-6 sm:flex-row">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary/10 font-bricolage text-2xl font-bold text-primary">
            {profile.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}
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
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex flex-col items-center gap-1.5 p-5 text-center">
              <stat.icon className="h-4 w-4 text-primary" />
              <span className="font-bricolage text-2xl font-extrabold text-primary">{stat.value}</span>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {profile.registrations.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-5 font-bricolage text-lg font-bold">Cours suivis</h2>
            <div className="flex flex-col gap-3">
              {profile.registrations.map(({ id: registrationId, course }) => (
                <Link key={registrationId} href={`/cours/${course.id}`} className="rounded-xl border p-4 text-sm font-medium hover:border-primary">
                  {course.title}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
