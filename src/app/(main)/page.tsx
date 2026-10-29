import Link from "next/link";
import { ArrowRight, BookOpen, Briefcase, MessageCircle, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { NewsletterForm } from "@/components/home/newsletter-form";
import { HomeCommunity } from "@/components/home/home-community";

export default function HomePage() {
  return (
    <div className="flex flex-col">

      {/* ── HERO ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b bg-background">
        {/* Grille décorative */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(43,78,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(43,78,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        {/* Lumières */}
        <div aria-hidden className="pointer-events-none absolute -top-48 -right-48 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[100px]" />
        <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-32 h-[400px] w-[400px] rounded-full bg-accent/8 blur-[80px]" />

        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 md:py-32">
          <div className="max-w-3xl">
            <div className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary sm:px-4 sm:text-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              🇸🇳 La communauté tech du Sénégal
            </div>

            <h1 className="mb-6 text-4xl font-extrabold leading-[1.08] tracking-tight text-foreground sm:text-6xl md:text-7xl">
              Apprendre l&apos;info{"\u00ad"}rmatique{" "}
              <span className="relative">
                <span className="text-primary">ensemble.</span>
                <svg aria-hidden className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                  <path d="M2 8 Q75 2 150 8 Q225 14 298 8" stroke="rgb(43 78 255 / 0.3)" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              </span>
            </h1>

            <p className="mb-8 max-w-xl text-base leading-relaxed text-muted-foreground sm:mb-10 sm:text-lg">
              Pose tes questions, découvre des cours en français et en wolof, 
              partage tes projets et trouve des opportunités. Bienvenue.
            </p>

            <div className="mb-10 flex flex-col gap-3 sm:mb-12 sm:flex-row sm:flex-wrap">
              <Button size="lg" className="w-full gap-2 rounded-xl shadow-lg shadow-primary/25 sm:w-auto" asChild>
                <Link href="/inscription">
                  Rejoindre gratuitement <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="secondary" className="w-full rounded-xl sm:w-auto" asChild>
                <Link href="/questions">Voir les questions</Link>
              </Button>
            </div>

          </div>
        </div>
      </section>

      <HomeCommunity />

      {/* ── FEATURES ─────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold text-primary mb-2">Tout en un</p>
            <h2 className="font-bricolage text-3xl md:text-4xl font-bold mb-4">Une plateforme, mille possibilités</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Conçue pour la communauté sénégalaise — mobile d&apos;abord, légère, accessible même avec une connexion lente.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: MessageCircle, title: "Questions & Réponses", desc: "Pose tes questions et échange avec la communauté.", href: "/questions", cta: "Explorer" },
              { icon: BookOpen,      title: "Cours",                 desc: "Des cours gratuits et payants, en français et en wolof.", href: "/cours",     cta: "Commencer" },
              { icon: Rocket,        title: "Espace Projets",       desc: "Partage tes réalisations, reçois des retours constructifs de la communauté.", href: "/projets",  cta: "Découvrir" },
              { icon: Briefcase,     title: "Emplois & Missions",   desc: "Stages, CDI et missions freelance dans la tech au Sénégal et en Afrique.", href: "/emplois",  cta: "Voir les offres" },
            ].map((f) => (
              <Card key={f.title} className="group border hover:border-primary hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-200">
                <CardContent className="p-6 flex flex-col gap-4 h-full">
                  <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200">
                    <f.icon className="h-5 w-5 text-primary group-hover:text-primary-foreground transition-colors duration-200" />
                  </div>
                  <div className="flex flex-col gap-1 flex-1">
                    <h3 className="font-semibold text-foreground">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                  <Link href={f.href} className="text-sm font-semibold text-primary flex items-center gap-1 group-hover:gap-2 transition-all duration-150">
                    {f.cta} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── TARIFS ───────────────────────────────────────────────── */}
      <section className="py-20 bg-muted/50 border-y">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-primary mb-2">Tarifs</p>
            <h2 className="font-bricolage text-3xl font-bold mb-3">Simple et transparent</h2>
            <p className="text-muted-foreground">
              Les activités communautaires restent gratuites ; les tarifs des cours
              sont affichés depuis les paramètres actuels de la plateforme.
            </p>
          </div>
          <Card className="mx-auto max-w-xl border-primary/20">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              <Badge variant="secondary">Sans abonnement automatique</Badge>
              <h3 className="font-bricolage text-2xl font-bold">
                Choisis ton cours et ta version
              </h3>
              <p className="text-sm text-muted-foreground">
                Consulte le prix de base, la version avancée et l’attestation de
                réussite. Les montants sont lus depuis les tarifs configurés.
              </p>
              <Button size="lg" className="gap-2" asChild>
                <Link href="/tarifs">
                  Voir les tarifs des cours
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
          <p className="text-center text-xs text-muted-foreground mt-5">
            Les activités gratuites de la communauté ne nécessitent aucun paiement.
          </p>
        </div>
      </section>

      {/* ── CTA NEWSLETTER ──────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-panel py-20">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(43,78,255,0.15),transparent_70%)]" />
        <div className="relative mx-auto max-w-xl px-4 sm:px-6 text-center">
          <h2 className="font-bricolage text-3xl md:text-4xl font-bold text-white mb-4">
            Reçois les nouvelles de la communauté
          </h2>
          <p className="text-slate-400 mb-8 text-lg">
            Abonne-toi aux annonces et aux événements de Sunu Tech Hub. Aucun compte nécessaire.
          </p>
          <NewsletterForm />
          <p className="text-slate-500 text-xs mt-4">Pas de spam. Désabonnement en un clic.</p>
        </div>
      </section>

    </div>
  );
}
