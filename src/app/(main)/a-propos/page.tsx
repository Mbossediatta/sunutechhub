import Link from "next/link";
import Image from "next/image";
import { Users, BookOpen, Rocket, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "À propos" };

export default function AProposPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12">

      {/* Hero */}
      <div className="text-center mb-14">
        <Image
          src="/logo-sunutech.png"
          alt="Sunu Tech Hub — Apprendre, partager, construire ensemble"
          width={330}
          height={82}
          className="mx-auto mb-5 h-auto w-64 sm:w-80"
        />
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

      <div className="mb-14 rounded-2xl border bg-card p-6 sm:p-8">
        <h2 className="mb-3 font-bricolage text-2xl font-bold">Un espace pour apprendre et construire</h2>
        <p className="leading-relaxed text-muted-foreground">
          Sunu Tech Hub rassemble des ressources de formation, des échanges entre membres
          et des projets réalisés autour des cours. Les contenus publiés et les activités
          évoluent avec la communauté.
        </p>
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
