"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckCircle2, Clock3, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type DashboardCourse = {
  id: string;
  active: boolean;
  _count: { registrations: number };
};

export default function TrainerHomePage() {
  const [courses, setCourses] = useState<DashboardCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/formateur/courses", { cache: "no-store" })
      .then(async (response) => {
        const result: unknown = await response.json().catch(() => null);
        if (!response.ok || !Array.isArray(result)) {
          throw new Error("Impossible de charger le résumé de tes cours.");
        }
        if (active) setCourses(result as DashboardCourse[]);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Impossible de charger le résumé de tes cours.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const publishedCourses = courses.filter((course) => course.active).length;
  const registrations = courses.reduce(
    (total, course) => total + (course._count?.registrations ?? 0),
    0,
  );
  const stats = [
    {
      label: "Mes cours",
      value: courses.length,
      icon: BookOpen,
      tone: "text-primary bg-primary/10",
    },
    {
      label: "Cours publiés",
      value: publishedCourses,
      icon: CheckCircle2,
      tone: "text-emerald-700 bg-emerald-500/10",
    },
    {
      label: "Inscriptions",
      value: registrations,
      icon: Clock3,
      tone: "text-amber-700 bg-amber-500/10",
    },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <section className="overflow-hidden rounded-2xl border bg-card">
        <div className="bg-gradient-to-br from-primary/10 via-card to-card p-6 sm:p-8">
          <p className="text-sm font-semibold text-primary">
            Votre espace de travail
          </p>
          <h2 className="mt-2 max-w-2xl font-bricolage text-2xl font-bold sm:text-3xl">
            Bienvenue dans votre espace formateur
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Créez vos cours, préparez leur contenu et suivez les apprenants
            inscrits. Les nouveaux cours restent en brouillon jusqu’à leur
            validation par un administrateur.
          </p>
          <Button asChild className="mt-5">
            <Link href="/formateur/cours">
              Gérer mes cours
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {error && (
        <p role="alert" className="rounded-xl border border-accent/20 bg-accent/10 p-4 text-sm text-accent">
          {error}
        </p>
      )}

      <section aria-label="Résumé de l’activité" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <article key={stat.label} className="rounded-2xl border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.tone}`}>
                <stat.icon className="h-5 w-5" />
              </span>
            </div>
            <p className="mt-4 font-bricolage text-3xl font-bold">
              {loading ? (
                <LoaderCircle
                  className="h-7 w-7 animate-spin text-muted-foreground"
                  aria-label="Chargement"
                />
              ) : (
                stat.value
              )}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border bg-card p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookOpen className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-bricolage text-lg font-bold">
                Construisez votre catalogue
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Ajoutez la description, le niveau, la durée, la couverture et
                les leçons de vos cours depuis un seul endroit.
              </p>
              <Button asChild variant="outline" className="mt-4">
                <Link href="/formateur/cours">
                  Ouvrir mes cours
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </article>
        <article className="rounded-2xl border bg-card p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-700">
              <Clock3 className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-bricolage text-lg font-bold">
                Publication et tarifs
              </h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Vous gérez le contenu pédagogique. La publication du cours et
                ses tarifs sont configurés par l’équipe d’administration.
              </p>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
