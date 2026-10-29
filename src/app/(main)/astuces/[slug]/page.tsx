"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, LoaderCircle, Volume2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { sandboxTipHtml } from "@/lib/sandbox-tip-html";

type Tip = {
  slug: string;
  title: string;
  description: string;
  htmlContent: string;
  narrationUrl: string | null;
  narrationFormat: "mp3" | "mp4" | null;
  createdAt: string;
};

export default function AstuceDetailPage() {
  const params = useParams<{ slug: string }>();
  const [tip, setTip] = useState<Tip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void fetch(`/api/tips/${encodeURIComponent(params.slug)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const result: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            result &&
            typeof result === "object" &&
            "message" in result &&
            typeof result.message === "string"
              ? result.message
              : "Impossible de charger cette astuce.";
          throw new Error(message);
        }
        if (
          !result ||
          typeof result !== "object" ||
          !("htmlContent" in result) ||
          typeof result.htmlContent !== "string" ||
          !("narrationUrl" in result) ||
          (typeof result.narrationUrl !== "string" &&
            result.narrationUrl !== null)
        ) {
          throw new Error("La réponse de l’astuce est invalide.");
        }
        if (active) setTip(result as Tip);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Impossible de charger cette astuce.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [params.slug]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <Link
        href="/astuces"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Toutes les astuces
      </Link>
      {loading ? (
        <div className="flex justify-center rounded-2xl border bg-card p-12">
          <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
        </p>
      ) : tip ? (
        <>
          <header className="mb-6">
            <h1 className="break-words font-bricolage text-3xl font-bold sm:text-4xl">
              {tip.title}
            </h1>
            {tip.description && (
              <p className="mt-3 whitespace-pre-wrap text-muted-foreground">
                {tip.description}
              </p>
            )}
          </header>
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <iframe
                title={`Animation : ${tip.title}`}
                srcDoc={sandboxTipHtml(tip.htmlContent)}
                sandbox="allow-scripts"
                referrerPolicy="no-referrer"
                className="h-[min(70vh,620px)] min-h-[360px] w-full border-0 bg-white"
              />
            </CardContent>
          </Card>
          {tip.narrationUrl && tip.narrationFormat && (
            <Card className="mt-5">
              <CardContent className="flex flex-col gap-3 p-5">
                <div className="flex items-center gap-2 font-semibold">
                  <Volume2 className="h-4 w-4 text-primary" />
                  Écouter l’explication
                </div>
                {tip.narrationFormat === "mp3" ? (
                  <audio
                    controls
                    preload="metadata"
                    src={tip.narrationUrl}
                    className="w-full"
                    aria-label={`Voix off de l’astuce ${tip.title}`}
                  >
                    Ton navigateur ne peut pas lire cette piste MP3.
                  </audio>
                ) : (
                  <video
                    controls
                    playsInline
                    preload="metadata"
                    src={tip.narrationUrl}
                    className="max-h-24 w-full"
                    aria-label={`Voix off de l’astuce ${tip.title}`}
                  >
                    Ton navigateur ne peut pas lire cette vidéo MP4.
                  </video>
                )}
              </CardContent>
            </Card>
          )}
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Astuce gratuite — aucune inscription nécessaire.
          </p>
        </>
      ) : null}
    </div>
  );
}
