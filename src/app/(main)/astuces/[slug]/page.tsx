"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  ArrowLeft,
  Heart,
  LoaderCircle,
  MessageCircle,
  Send,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { sandboxTipHtml } from "@/lib/sandbox-tip-html";

type TipComment = {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string };
};

type Tip = {
  slug: string;
  title: string;
  description: string;
  htmlContent: string;
  narrationUrl: string | null;
  narrationFormat: "mp3" | "mp4" | null;
  createdAt: string;
  comments: TipComment[];
  _count: { likes: number; comments: number };
};

function messageFrom(result: unknown) {
  if (result && typeof result === "object" && "message" in result) {
    const message = result.message;
    if (typeof message === "string") return message;
    if (
      Array.isArray(message) &&
      message.every((item) => typeof item === "string")
    ) {
      return message.join(" ");
    }
  }
  return "La requête n’a pas abouti.";
}

export default function AstuceDetailPage() {
  const params = useParams<{ slug: string }>();
  const [tip, setTip] = useState<Tip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [comments, setComments] = useState<TipComment[]>([]);
  const [likeCount, setLikeCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [comment, setComment] = useState("");
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState("");

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
            result.narrationUrl !== null) ||
          !("comments" in result) ||
          !Array.isArray(result.comments) ||
          !("_count" in result)
        ) {
          throw new Error("La réponse de l’astuce est invalide.");
        }
        const loadedTip = result as Tip;
        if (
          !loadedTip._count ||
          typeof loadedTip._count.likes !== "number" ||
          typeof loadedTip._count.comments !== "number" ||
          !loadedTip.comments.every(
            (item) =>
              typeof item.id === "string" &&
              typeof item.body === "string" &&
              typeof item.createdAt === "string" &&
              typeof item.user?.id === "string" &&
              typeof item.user?.name === "string",
          )
        ) {
          throw new Error("La réponse de l’astuce est invalide.");
        }
        if (active) {
          setTip(loadedTip);
          setComments(loadedTip.comments);
          setLikeCount(loadedTip._count.likes);
        }
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

  useEffect(() => {
    let active = true;
    void fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return;
        if (active) setAuthenticated(true);
        const likeResponse = await fetch(
          `/api/tips/${encodeURIComponent(params.slug)}/like`,
          { cache: "no-store" },
        );
        if (!likeResponse.ok) return;
        const result: unknown = await likeResponse.json().catch(() => null);
        if (
          active &&
          result &&
          typeof result === "object" &&
          "liked" in result &&
          typeof result.liked === "boolean"
        ) {
          setLiked(result.liked);
        }
      })
      .catch(() => {
        if (active) setAuthenticated(false);
      });
    return () => {
      active = false;
    };
  }, [params.slug]);

  const toggleLike = async () => {
    if (!authenticated) {
      setActionError("Connecte-toi pour aimer cette astuce.");
      return;
    }
    setWorking(true);
    setActionError("");
    try {
      const response = await fetch(
        `/api/tips/${encodeURIComponent(params.slug)}/like`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ liked: !liked }),
        },
      );
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(messageFrom(result));
      if (
        !result ||
        typeof result !== "object" ||
        !("liked" in result) ||
        typeof result.liked !== "boolean" ||
        !("count" in result) ||
        typeof result.count !== "number"
      ) {
        throw new Error("La réponse du serveur est invalide.");
      }
      setLiked(result.liked);
      setLikeCount(result.count);
    } catch (actionError) {
      setActionError(
        actionError instanceof Error
          ? actionError.message
          : "Impossible d’aimer cette astuce.",
      );
    } finally {
      setWorking(false);
    }
  };

  const submitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authenticated) {
      setActionError("Connecte-toi pour commenter cette astuce.");
      return;
    }
    setWorking(true);
    setActionError("");
    try {
      const response = await fetch(
        `/api/tips/${encodeURIComponent(params.slug)}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: comment }),
        },
      );
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(messageFrom(result));
      if (
        !result ||
        typeof result !== "object" ||
        !("id" in result) ||
        typeof result.id !== "string" ||
        !("body" in result) ||
        typeof result.body !== "string" ||
        !("createdAt" in result) ||
        typeof result.createdAt !== "string" ||
        !("user" in result) ||
        !result.user ||
        typeof result.user !== "object" ||
        !("id" in result.user) ||
        typeof result.user.id !== "string" ||
        !("name" in result.user) ||
        typeof result.user.name !== "string"
      ) {
        throw new Error("La réponse du commentaire est invalide.");
      }
      setComments((current) => [...current, result as TipComment]);
      setComment("");
    } catch (actionError) {
      setActionError(
        actionError instanceof Error
          ? actionError.message
          : "Impossible d’ajouter le commentaire.",
      );
    } finally {
      setWorking(false);
    }
  };

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
          <Card className="mx-auto w-full max-w-[420px] overflow-hidden">
            <CardContent className="p-0">
              <div
                className="relative mx-auto aspect-[9/16] w-full bg-[#060A18]"
                style={{ width: "min(100%, 420px, 42.1875dvh)" }}
              >
                <iframe
                  title={`Animation : ${tip.title}`}
                  srcDoc={sandboxTipHtml(tip.htmlContent)}
                  sandbox="allow-scripts"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 h-full w-full border-0 bg-[#060A18]"
                />
              </div>
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
                    className="max-h-[75dvh] w-full rounded-xl bg-black object-contain"
                    aria-label={`Voix off de l’astuce ${tip.title}`}
                  >
                    Ton navigateur ne peut pas lire cette vidéo MP4.
                  </video>
                )}
              </CardContent>
            </Card>
          )}
          <div className="mx-auto mt-6 w-full max-w-2xl">
            <Button
              onClick={() => void toggleLike()}
              disabled={working}
              variant={liked ? "default" : "outline"}
              className="gap-2"
            >
              <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
              J’aime · {likeCount}
            </Button>
            {actionError && (
              <p
                role="alert"
                className="mt-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
              >
                {actionError}
              </p>
            )}
            <Card className="mt-5">
              <CardContent className="p-5">
                <h2 className="mb-4 flex items-center gap-2 font-semibold">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  Commentaires (
                  {tip._count.comments + comments.length - tip.comments.length})
                </h2>
                {comments.length ? (
                  <div className="mb-5 flex flex-col divide-y">
                    {comments.map((item) => (
                      <article
                        key={item.id}
                        className="break-words py-3 first:pt-0 last:pb-0"
                      >
                        <p className="text-sm">{item.body}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          <Link
                            href={`/profil/${item.user.id}`}
                            className="font-medium hover:text-primary"
                          >
                            {item.user.name}
                          </Link>
                          {" · "}
                          {new Intl.DateTimeFormat("fr-FR", {
                            dateStyle: "medium",
                          }).format(new Date(item.createdAt))}
                        </p>
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="mb-5 text-sm text-muted-foreground">
                    Pas encore de commentaire. Lance la conversation !
                  </p>
                )}
                {authenticated ? (
                  <form
                    onSubmit={(event) => void submitComment(event)}
                    className="flex flex-col gap-2 sm:flex-row"
                  >
                    <Input
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                      minLength={2}
                      maxLength={2000}
                      required
                      placeholder="Écris un commentaire…"
                    />
                    <Button
                      type="submit"
                      disabled={working || comment.trim().length < 2}
                      className="gap-2"
                    >
                      <Send className="h-4 w-4" />
                      Commenter
                    </Button>
                  </form>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    <Link className="text-primary underline" href="/connexion">
                      Connecte-toi
                    </Link>{" "}
                    pour commenter ou aimer cette astuce.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  );
}
