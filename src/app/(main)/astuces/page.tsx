"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Lightbulb, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { sandboxTipHtml } from "@/lib/sandbox-tip-html";

type Tip = {
  slug: string;
  title: string;
  description: string;
  htmlContent: string;
  createdAt: string;
};

export default function AstucesPage() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch("/api/tips", { cache: "no-store" })
      .then(async (response) => {
        const result: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            result &&
            typeof result === "object" &&
            "message" in result &&
            typeof result.message === "string"
              ? result.message
              : "Impossible de charger les astuces.";
          throw new Error(message);
        }
        if (!Array.isArray(result)) {
          throw new Error("La réponse des astuces est invalide.");
        }
        if (active) setTips(result as Tip[]);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Impossible de charger les astuces.",
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

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-9 max-w-2xl">
        <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
          <Lightbulb className="h-4 w-4" /> Gratuit et ouvert à tous
        </span>
        <h1 className="font-bricolage text-3xl font-bold sm:text-4xl">
          Astuces numériques
        </h1>
        <p className="mt-3 text-muted-foreground">
          Découvrez un aperçu animé de chaque astuce, puis ouvrez-la pour
          apprendre une technique à la fois, sans inscription.
        </p>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border bg-card p-10 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" /> Chargement des
          astuces…
        </div>
      ) : tips.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tips.map((tip) => (
            <Card
              key={tip.slug}
              className="h-full overflow-hidden transition hover:border-primary/40"
            >
              <div className="overflow-hidden border-b bg-white">
                <iframe
                  title={`Aperçu animé : ${tip.title}`}
                  srcDoc={sandboxTipHtml(tip.htmlContent)}
                  sandbox="allow-scripts"
                  referrerPolicy="no-referrer"
                  tabIndex={-1}
                  aria-label={`Aperçu animé de l’astuce ${tip.title}`}
                  className="pointer-events-none aspect-video w-full border-0"
                />
              </div>
              <CardContent className="flex h-full flex-col p-5">
                <h2 className="font-bricolage text-lg font-bold">
                  {tip.title}
                </h2>
                <p className="mt-2 flex-1 whitespace-pre-wrap text-sm text-muted-foreground">
                  {tip.description}
                </p>
                <Button asChild className="mt-5 w-fit">
                  <Link href={`/astuces/${encodeURIComponent(tip.slug)}`}>
                    Voir l’astuce <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        !error && (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              Les premières astuces seront bientôt publiées.
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
