import Link from "next/link";
import { Code2, Users, BookOpen, Rocket, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "À propos" };

const team = [
  { name: "Équipe Sunu Tech Hub", role: "Fondateurs", city: "Dakar, Sénégal", initials: "ST" },
];

const milestones = [
  { date: "Jan. 2026", event: "Idée fondatrice — combler le manque de ressources tech en wolof et français" },
  { date: "Avr. 2026", event: "Premiers cours publiés, 50 membres fondateurs" },
  { date: "Sep. 2026", event: "Lancement public — 500 membres en 30 jours" },
  { date: "Oct. 2026", event: "2 400+ membres actifs, 1 200+ questions résolues" },
];

export default function AProposPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12">

      {/* Hero */}
      <div className="text-center mb-14">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary mx-auto mb-5">
          <Code2 className="h-8 w-8 text-white" />
        </div>
        <h1 className="font-bricolage text-4xl font-extrabold mb-4">À propos de Sunu Tech Hub</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">
          <strong className="text-foreground">Sunu</strong> signifie <em>notre</em> en wolof. 
          Sunu Tech Hub, c&apos;est <strong className="text-foreground">notre pôle technologique</strong> — 
          la communauté informatique construite par et pour les Sénégalais.
        </p>
      </div>

      {/* Mission */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">
        {[
          { icon: Users,    title: "Communauté d'abord", desc: "Chaque ligne de code est écrite pour servir la communauté. Les membres créent la valeur, nous structurons l'espace." },
          { icon: BookOpen, title: "Apprendre ensemble", desc: "Des cours gratuits en wolof et en français, accessibles même avec une connexion lente. L'éducation sans barrières." },
          { icon: Rocket,   title: "Construire l'avenir", desc: "Faire du Sénégal un hub tech africain, une question, un cours et un projet à la fois." },
        ].map((m) => (
          <Card key={m.title} className="border text-center">
            <CardContent className="p-6">
              <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <m.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">{m.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Histoire */}
      <div className="mb-14">
        <h2 className="font-bricolage text-2xl font-bold mb-6">Notre histoire</h2>
        <div className="flex flex-col gap-4">
          {milestones.map((m, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="h-3 w-3 rounded-full bg-primary mt-1.5 shrink-0" />
                {i < milestones.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1" />}
              </div>
              <div className="pb-5">
                <span className="text-xs font-bold text-primary uppercase tracking-wide">{m.date}</span>
                <p className="text-sm text-foreground mt-0.5">{m.event}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-14">
        {[
          { value: "2 400+", label: "Membres" },
          { value: "1 200+", label: "Questions résolues" },
          { value: "48",     label: "Cours gratuits" },
          { value: "320+",   label: "Projets partagés" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border bg-card p-5 text-center">
            <div className="font-bricolage text-2xl font-extrabold text-primary mb-0.5">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="rounded-2xl bg-panel p-8 text-center relative overflow-hidden">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(43,78,255,0.15),transparent_70%)]" />
        <div className="relative z-10">
          <Heart className="h-8 w-8 text-primary mx-auto mb-3" />
          <h2 className="font-bricolage text-2xl font-bold text-white mb-2">Rejoins l&apos;aventure</h2>
          <p className="text-slate-400 mb-6 max-w-sm mx-auto text-sm">
            Que tu sois débutant ou expert, il y a une place pour toi dans la communauté.
          </p>
          <div className="flex gap-3 justify-center">
            <Button asChild><Link href="/inscription">S&apos;inscrire gratuitement</Link></Button>
            <Button variant="secondary" asChild><Link href="/questions">Explorer les questions</Link></Button>
          </div>
        </div>
      </div>

    </div>
  );
}
