"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, BookOpen, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Course = {
  id: string;
  title: string;
  isFree: boolean;
  prices: {
    base: number;
    advanced: number;
    upgrade: number;
    attestation: number;
    accessDays: number;
    currency: string;
  };
};

type Pricing = {
  prix_cours_base: number;
  prix_cours_avance: number;
  prix_passage_avance: number;
  prix_attestation: number;
  duree_acces_jours: number;
  devise: string;
};

const formatNumber = new Intl.NumberFormat("fr-FR");

function formatPrice(value: number, currency: string) {
  return `${formatNumber.format(value)} ${currency}`;
}

export default function TarifsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [courseId, setCourseId] = useState("");
  const [level, setLevel] = useState<"base" | "advanced">("base");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/courses", { cache: "no-store" }).then(async (response) => {
        const result: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error("Impossible de charger les cours.");
        }
        if (!Array.isArray(result)) throw new Error("Réponse des cours invalide.");
        return result as Course[];
      }),
      fetch("/api/pricing", { cache: "no-store" }).then(async (response) => {
        const result: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            result &&
            typeof result === "object" &&
            "message" in result &&
            typeof result.message === "string"
              ? result.message
              : "Impossible de charger les tarifs.";
          throw new Error(message);
        }
        return result as Pricing;
      }),
    ])
      .then(([loadedCourses, loadedPricing]) => {
        if (!active) return;
        setCourses(loadedCourses);
        setPricing(loadedPricing);
        setCourseId(loadedCourses[0]?.id ?? "");
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Impossible de charger les tarifs.",
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

  const course = useMemo(
    () => courses.find((item) => item.id === courseId),
    [courses, courseId],
  );
  const total = course
    ? course.isFree
      ? 0
      : level === "base"
        ? course.prices.base
        : course.prices.advanced
    : null;
  const currency = course?.prices.currency ?? pricing?.devise ?? "FCFA";

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <p className="mb-2 text-sm font-semibold text-primary">Tarification transparente</p>
        <h1 className="font-bricolage text-3xl font-extrabold sm:text-4xl">Tarifs des cours</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Les prix et la durée d’accès sont gérés par la plateforme et peuvent varier
          selon le cours. L’accès payant dure {pricing?.duree_acces_jours ?? "…"} jours
          à compter du paiement. Aucun prélèvement automatique.
        </p>
      </header>

      {error && (
        <p role="alert" className="mb-5 rounded-xl border border-accent/20 bg-accent/10 p-4 text-sm text-accent">
          {error}
        </p>
      )}

      <Card>
        <CardContent className="flex flex-col gap-6 p-5 sm:p-8">
          {loading ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Chargement des tarifs…
            </div>
          ) : courses.length ? (
            <>
              <label className="flex flex-col gap-2 text-sm font-semibold">
                Quel cours ?
                <select
                  value={courseId}
                  onChange={(event) => setCourseId(event.target.value)}
                  className="h-11 rounded-xl border border-input bg-background px-3 font-normal"
                >
                  {courses.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.title}
                    </option>
                  ))}
                </select>
              </label>

              {course && (
                <>
                  {!course.isFree && (
                    <fieldset className="grid gap-3 sm:grid-cols-2">
                      <legend className="mb-2 text-sm font-semibold">Choisir une version</legend>
                      {(
                        [
                          ["base", "Version de base", course.prices.base],
                          ["advanced", "Version avancée", course.prices.advanced],
                        ] as const
                      ).map(([value, label, amount]) => (
                        <label
                          key={value}
                          className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                            level === value
                              ? "border-primary bg-primary/5"
                              : "hover:border-primary/40"
                          }`}
                        >
                          <input
                            type="radio"
                            name="course-level"
                            value={value}
                            checked={level === value}
                            onChange={() => setLevel(value)}
                            className="sr-only"
                          />
                          <span className="block font-semibold">{label}</span>
                          <span className="mt-1 block text-sm text-muted-foreground">
                            {formatPrice(amount, currency)}
                          </span>
                        </label>
                      ))}
                    </fieldset>
                  )}

                  <div className="rounded-xl bg-muted/50 p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BookOpen className="h-4 w-4 text-primary" />
                      Accès : {course.isFree ? "gratuit" : `${course.prices.accessDays} jours`}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-4 border-t pt-3">
                      <span className="font-semibold">Total</span>
                      <span className="font-bricolage text-2xl font-extrabold text-primary">
                        {formatPrice(total ?? 0, currency)}
                      </span>
                    </div>
                  </div>

                  {!course.isFree && (
                    <p className="text-sm text-muted-foreground">
                      Passage de la version de base à l’avancée pendant un accès actif :
                      {" "}{formatPrice(course.prices.upgrade, currency)} supplémentaires.
                    </p>
                  )}
                  <p className="flex items-start gap-2 text-sm text-muted-foreground">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    Attestation de réussite : {formatPrice(course.prices.attestation, currency)},
                    achetable après validation du projet, même sans inscription active.
                  </p>
                  <Button asChild className="w-full rounded-xl sm:w-fit">
                    <Link href={`/cours/${course.id}`}>
                      Voir le cours
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </>
              )}
            </>
          ) : (
            <p className="py-4 text-sm text-muted-foreground">
              Aucun cours n’est disponible pour le moment.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
