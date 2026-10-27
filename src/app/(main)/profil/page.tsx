import Link from "next/link";
import { MapPin, Calendar, MessageSquare, CheckCircle2, FolderGit2, Star, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Profil" };

const user = {
  name: "Moussa Diallo", city: "Dakar, Sénégal",
  bio: "Développeur web passionné, étudiant à l'ESP. J'aime partager ce que j'apprends avec la communauté.",
  joined: "Octobre 2026",
  skills: ["JavaScript", "React", "Node.js", "PostgreSQL"],
  badges: ["Mentor"],
  stats: [
    { icon: MessageSquare, value: 12,  label: "Questions" },
    { icon: CheckCircle2,  value: 47,  label: "Réponses" },
    { icon: Star,          value: 23,  label: "Validées" },
    { icon: FolderGit2,    value: 3,   label: "Projets" },
  ],
  courses: [
    { title: "Les bases du développement web", progress: 100 },
    { title: "React — De zéro à professionnel", progress: 65 },
    { title: "Bases de données avec PostgreSQL", progress: 20 },
  ],
};

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

export default function ProfilPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10">

      {/* En-tête profil */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            {/* Avatar */}
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bricolage text-2xl font-bold shrink-0">
              {getInitials(user.name)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1 className="font-bricolage text-2xl font-bold">{user.name}</h1>
                {user.badges.map((b) => <Badge key={b} variant="secondary">{b}</Badge>)}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-3">
                <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{user.city}</span>
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Membre depuis {user.joined}</span>
              </div>
              <p className="text-sm text-foreground mb-4">{user.bio}</p>
              <div className="flex flex-wrap gap-1.5">
                {user.skills.map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
              </div>
            </div>

            <Button variant="secondary" size="sm" asChild>
              <Link href="/profil/modifier"><Pencil className="h-3.5 w-3.5" /> Modifier</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {user.stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5 text-center flex flex-col items-center gap-2">
              <s.icon className="h-5 w-5 text-primary" />
              <span className="font-bricolage text-2xl font-extrabold text-primary">{s.value}</span>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cours */}
      <Card>
        <CardContent className="p-6">
          <h2 className="font-bricolage text-lg font-bold mb-5">Mes cours</h2>
          <div className="flex flex-col gap-5">
            {user.courses.map((c) => (
              <div key={c.title}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{c.title}</span>
                  {c.progress === 100
                    ? <Badge variant="default"><CheckCircle2 className="h-3 w-3 mr-1" />Terminé</Badge>
                    : <span className="text-xs text-muted-foreground">{c.progress}%</span>
                  }
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700"
                    style={{ width: `${c.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
