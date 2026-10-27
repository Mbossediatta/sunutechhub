import Link from "next/link";
import { ArrowLeft, MapPin, Calendar, MessageSquare, CheckCircle2, FolderGit2, Star, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Metadata } from "next";

export function generateMetadata({ params }: { params: { id: string } }): Metadata {
  return { title: `Profil — Sunu Tech Hub` };
}

// Profils d'exemple
const PROFILES: Record<string, {
  name: string; city: string; bio: string; joined: string;
  skills: string[]; badges: string[];
  stats: { questions: number; answers: number; validated: number; projects: number };
  courses: { title: string; progress: number }[];
}> = {
  "1": {
    name: "Moussa Diallo", city: "Dakar, Sénégal",
    bio: "Développeur web passionné, étudiant à l'ESP. J'aime partager ce que j'apprends avec la communauté Sunu Tech Hub.",
    joined: "Octobre 2026",
    skills: ["JavaScript", "React", "Node.js", "PostgreSQL"],
    badges: ["Mentor"],
    stats: { questions: 12, answers: 47, validated: 23, projects: 3 },
    courses: [
      { title: "Les bases du développement web", progress: 100 },
      { title: "React — De zéro à professionnel", progress: 65 },
    ],
  },
  "2": {
    name: "Fatou Sow", city: "Saint-Louis, Sénégal",
    bio: "Développeuse mobile Flutter, passionnée par l'accessibilité et les apps qui changent la vie des Sénégalais.",
    joined: "Septembre 2026",
    skills: ["Flutter", "Dart", "Firebase", "UI/UX"],
    badges: ["Mentor"],
    stats: { questions: 34, answers: 120, validated: 65, projects: 5 },
    courses: [
      { title: "Les bases du développement web", progress: 100 },
    ],
  },
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

export default function ProfilPublicPage({ params }: { params: { id: string } }) {
  const profile = PROFILES[params.id] ?? PROFILES["1"];

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
      <Link href="/questions" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 group transition-colors">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        Retour
      </Link>

      {/* En-tête profil */}
      <Card className="mb-6 border">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            {/* Avatar */}
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center text-primary font-bricolage text-2xl font-bold shrink-0">
              {getInitials(profile.name)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h1 className="font-bricolage text-2xl font-bold">{profile.name}</h1>
                {profile.badges.map((b) => <Badge key={b} variant="secondary" className="text-xs">{b}</Badge>)}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-3">
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{profile.city}</span>
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Membre depuis {profile.joined}</span>
              </div>
              <p className="text-sm text-foreground mb-4">{profile.bio}</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((s) => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
              </div>
            </div>

            <Button size="sm" variant="secondary" className="rounded-xl gap-1.5 shrink-0">
              <ExternalLink className="h-3.5 w-3.5" /> Partager
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { icon: MessageSquare, value: profile.stats.questions,  label: "Questions" },
          { icon: CheckCircle2,  value: profile.stats.answers,    label: "Réponses" },
          { icon: Star,          value: profile.stats.validated,  label: "Validées" },
          { icon: FolderGit2,    value: profile.stats.projects,   label: "Projets" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5 text-center flex flex-col items-center gap-1.5">
              <s.icon className="h-4 w-4 text-primary" />
              <span className="font-bricolage text-2xl font-extrabold text-primary">{s.value}</span>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cours suivis */}
      {profile.courses.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h2 className="font-bricolage text-lg font-bold mb-5">Cours suivis</h2>
            <div className="flex flex-col gap-4">
              {profile.courses.map((c) => (
                <div key={c.title}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium">{c.title}</span>
                    {c.progress === 100
                      ? <Badge variant="default" className="text-xs gap-1"><CheckCircle2 className="h-2.5 w-2.5" />Terminé</Badge>
                      : <span className="text-xs text-muted-foreground">{c.progress}%</span>}
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${c.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
