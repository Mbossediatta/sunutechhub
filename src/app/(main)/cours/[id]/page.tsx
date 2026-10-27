"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, BookOpen, LoaderCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Course = {
  id: string;
  title: string;
  description: string;
  language: string;
  level: string;
  instructorName: string;
  duration: string;
  lessons: number;
  subjects: string[];
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

type CheckoutResult = { checkoutUrl?: string | null; status?: string };

function price(value: number, currency: string) {
  return `${new Intl.NumberFormat("fr-FR").format(value)} ${currency}`;
}

export default function CoursDetailPage() {
  const params = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [method, setMethod] = useState<"WAVE" | "ORANGE_MONEY">("WAVE");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/courses`, { cache: "no-store" });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(result)) throw new Error("Impossible de charger le cours.");
      const found = (result as Course[]).find((item) => item.id === params.id);
      if (!found) throw new Error("Cours introuvable.");
      setCourse(found);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger le cours.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const registerFree = async () => {
    if (!course) return;
    setWorking("free");
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/courses/${encodeURIComponent(course.id)}/enroll-free`, { method: "POST" });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = result && typeof result === "object" && "message" in result && typeof result.message === "string" ? result.message : "Impossible de s’inscrire à ce cours.";
        throw new Error(message);
      }
      setNotice("Ton inscription gratuite au cours est enregistrée.");
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : "Impossible de s’inscrire.");
    } finally {
      setWorking("");
    }
  };

  const checkout = async (object: "INSCRIPTION_BASE" | "INSCRIPTION_AVANCE" | "ATTESTATION") => {
    if (!course) return;
    setWorking(object);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id, object, method }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = result && typeof result === "object" && "message" in result && typeof result.message === "string" ? result.message : "Impossible de démarrer le paiement.";
        throw new Error(message);
      }
      const payment = result as CheckoutResult;
      if (payment.checkoutUrl) {
        const checkoutUrl = new URL(payment.checkoutUrl);
        if (checkoutUrl.protocol !== "https:" && checkoutUrl.protocol !== "http:") {
          throw new Error("Lien de paiement invalide.");
        }
        window.location.assign(checkoutUrl.toString());
      } else {
        setNotice("La demande a été traitée. Vérifie ton espace de paiement pour le statut.");
      }
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : "Impossible de démarrer le paiement.");
    } finally {
      setWorking("");
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link href="/cours" className="mb-7 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Retour aux cours</Link>
      {error && <p role="alert" className="mb-4 rounded-xl border border-accent/20 bg-accent/10 p-4 text-sm text-accent">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary">{notice}</p>}
      {loading ? (
        <div className="flex justify-center rounded-2xl border bg-card p-10"><LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : course ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <section>
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge>{course.level}</Badge>
              {course.subjects.map((subject) => <Badge key={subject} variant="outline">{subject}</Badge>)}
            </div>
            <h1 className="font-bricolage text-3xl font-bold">{course.title}</h1>
            <p className="mt-4 whitespace-pre-wrap leading-relaxed text-muted-foreground">{course.description}</p>
            <dl className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border bg-card p-5 text-sm">
              <div><dt className="text-muted-foreground">Formateur</dt><dd className="mt-1 font-medium">{course.instructorName}</dd></div>
              <div><dt className="text-muted-foreground">Langue</dt><dd className="mt-1 font-medium">{course.language}</dd></div>
              <div><dt className="text-muted-foreground">Durée</dt><dd className="mt-1 font-medium">{course.duration || "Non précisée"}</dd></div>
              <div><dt className="text-muted-foreground">Leçons</dt><dd className="mt-1 font-medium">{course.lessons}</dd></div>
            </dl>
            <p className="mt-5 text-sm text-muted-foreground">
              {course.isFree
                ? "Ce cours est gratuit."
                : `Chaque inscription payante donne accès pendant ${course.prices.accessDays} jours à compter du paiement.`}
            </p>
          </section>

          <Card className="h-fit lg:sticky lg:top-24">
            <CardContent className="flex flex-col gap-4 p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><BookOpen className="h-5 w-5" /></span>
              {course.isFree ? (
                <Button disabled={working !== ""} onClick={() => void registerFree()}>
                  {working === "free" && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  S’inscrire gratuitement
                </Button>
              ) : (
                <>
                  <label className="flex flex-col gap-2 text-sm font-medium">
                    Moyen de paiement
                    <select value={method} onChange={(event) => setMethod(event.target.value as typeof method)} className="h-11 rounded-xl border border-input bg-background px-3">
                      <option value="WAVE">Wave</option>
                      <option value="ORANGE_MONEY">Orange Money</option>
                    </select>
                  </label>
                  <Button variant="outline" disabled={working !== ""} onClick={() => void checkout("INSCRIPTION_BASE")}>
                    {working === "INSCRIPTION_BASE" && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    Version de base — {price(course.prices.base, course.prices.currency)}
                  </Button>
                  <Button disabled={working !== ""} onClick={() => void checkout("INSCRIPTION_AVANCE")}>
                    {working === "INSCRIPTION_AVANCE" && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    Version avancée — {price(course.prices.advanced, course.prices.currency)}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Si ton accès de base est actif, le passage à la version avancée est facturé {price(course.prices.upgrade, course.prices.currency)}.
                  </p>
                  <div className="border-t pt-4">
                    <p className="flex items-start gap-2 text-xs text-muted-foreground">
                      <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />
                      Attestation de réussite après validation du projet :{" "}
                      {price(course.prices.attestation, course.prices.currency)}.
                    </p>
                    <Button className="mt-3 w-full" variant="secondary" disabled={working !== ""} onClick={() => void checkout("ATTESTATION")}>
                      {working === "ATTESTATION" && <LoaderCircle className="h-4 w-4 animate-spin" />}
                      Acheter l’attestation de réussite
                    </Button>
                  </div>
                  <p className="text-center text-xs text-muted-foreground">Aucun prélèvement automatique.</p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
