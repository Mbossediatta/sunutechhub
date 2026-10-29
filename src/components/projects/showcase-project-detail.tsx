"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ExternalLink, Heart, MessageCircle, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string };
};

export type ShowcaseProjectDetail = {
  id: string;
  title: string;
  description: string;
  link: string | null;
  technologies: string[];
  imageUrls: string[];
  createdAt: string;
  user: { id: string; name: string; city: string | null };
  comments: Comment[];
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

export function ShowcaseProjectDetailView({
  project,
}: {
  project: ShowcaseProjectDetail;
}) {
  const [comments, setComments] = useState(project.comments);
  const [likeCount, setLikeCount] = useState(project._count.likes);
  const [liked, setLiked] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [comment, setComment] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return false;
        const likeResponse = await fetch(
          `/api/community/showcase-projects/${encodeURIComponent(project.id)}/like`,
          { cache: "no-store" },
        );
        if (!likeResponse.ok) return true;
        const result: unknown = await likeResponse.json().catch(() => null);
        if (
          active &&
          result &&
          typeof result === "object" &&
          "liked" in result
        ) {
          setLiked(result.liked === true);
        }
        return true;
      })
      .then((isAuthenticated) => {
        if (active) setAuthenticated(isAuthenticated);
      })
      .catch(() => {
        if (active) setAuthenticated(false);
      });
    return () => {
      active = false;
    };
  }, [project.id]);

  const toggleLike = async () => {
    if (!authenticated) {
      setError("Connecte-toi pour aimer ce projet.");
      return;
    }
    setWorking(true);
    setError("");
    try {
      const response = await fetch(
        `/api/community/showcase-projects/${encodeURIComponent(project.id)}/like`,
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
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Impossible d’aimer ce projet.",
      );
    } finally {
      setWorking(false);
    }
  };

  const submitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authenticated) {
      setError("Connecte-toi pour commenter ce projet.");
      return;
    }
    setWorking(true);
    setError("");
    try {
      const response = await fetch(
        `/api/community/showcase-projects/${encodeURIComponent(project.id)}/comments`,
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
        !("name" in result.user) ||
        typeof result.user.name !== "string" ||
        !("id" in result.user) ||
        typeof result.user.id !== "string"
      ) {
        throw new Error("La réponse du commentaire est invalide.");
      }
      setComments((current) => [...current, result as Comment]);
      setComment("");
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Impossible d’ajouter le commentaire.",
      );
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link
        href="/projets"
        className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        ← Tous les projets
      </Link>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        <main className="min-w-0">
          {project.imageUrls.length > 0 ? (
            <div className="mb-6 grid gap-3 sm:grid-cols-2">
              {project.imageUrls.map((image, index) => (
                <Image
                  key={image}
                  src={image}
                  alt={`Capture ${index + 1} du projet ${project.title}`}
                  width={1200}
                  height={675}
                  unoptimized
                  className="aspect-video w-full rounded-2xl border object-cover"
                />
              ))}
            </div>
          ) : (
            <div className="mb-6 flex aspect-video items-center justify-center rounded-2xl border bg-gradient-to-br from-primary/10 to-muted text-5xl">
              🚀
            </div>
          )}
          <div className="mb-3 flex flex-wrap gap-2">
            {project.technologies.map((technology) => (
              <Badge key={technology} variant="outline">
                {technology}
              </Badge>
            ))}
          </div>
          <h1 className="break-words font-bricolage text-3xl font-bold">
            {project.title}
          </h1>
          <p className="mt-4 whitespace-pre-wrap leading-7 text-muted-foreground">
            {project.description}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              onClick={() => void toggleLike()}
              disabled={working}
              variant={liked ? "default" : "outline"}
              className="gap-2"
            >
              <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />{" "}
              J’aime · {likeCount}
            </Button>
            {project.link && (
              <Button variant="outline" asChild>
                <a
                  href={project.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Voir la démo
                </a>
              </Button>
            )}
          </div>
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <Card className="mt-8">
            <CardContent className="p-5">
              <h2 className="mb-4 flex items-center gap-2 font-semibold">
                <MessageCircle className="h-4 w-4 text-primary" />
                Commentaires (
                {project._count.comments +
                  (comments.length - project.comments.length)}
                )
              </h2>
              {comments.length ? (
                <div className="mb-5 flex flex-col divide-y">
                  {comments.map((item) => (
                    <article
                      key={item.id}
                      className="py-3 first:pt-0 last:pb-0"
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
                  pour commenter ou aimer ce projet.
                </p>
              )}
            </CardContent>
          </Card>
        </main>

        <aside>
          <Card className="lg:sticky lg:top-24">
            <CardContent className="flex flex-col gap-4 p-5">
              <div>
                <p className="text-xs text-muted-foreground">Présenté par</p>
                <Link
                  href={`/profil/${project.user.id}`}
                  className="font-semibold hover:text-primary"
                >
                  {project.user.name}
                </Link>
                {project.user.city && (
                  <p className="text-xs text-muted-foreground">
                    {project.user.city}
                  </p>
                )}
              </div>
              <p className="border-t pt-3 text-xs text-muted-foreground">
                Partagé le{" "}
                {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(
                  new Date(project.createdAt),
                )}
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
