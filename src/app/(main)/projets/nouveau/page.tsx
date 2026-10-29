"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ImagePlus,
  LoaderCircle,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const TECH_SUGGESTIONS = [
  "React",
  "Next.js",
  "Node.js",
  "Flutter",
  "Python",
  "PostgreSQL",
  "Firebase",
  "MongoDB",
  "Django",
  "Vue.js",
  "TypeScript",
  "Tailwind CSS",
];
const MAX_SCREENSHOTS = 5;
const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
type Step = 1 | 2 | 3;
type AuthState = "checking" | "authenticated" | "guest";

function responseMessage(result: unknown, fallback: string) {
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
  return fallback;
}

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(responseMessage(result, "La requête n’a pas abouti."));
  }
  return result as T;
}

export default function NouveauProjetPage() {
  const [step, setStep] = useState<Step>(1);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [technologies, setTechnologies] = useState<string[]>([]);
  const [customTechnology, setCustomTechnology] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [authState, setAuthState] = useState<AuthState>("checking");
  const [error, setError] = useState("");
  const [publishedProjectId, setPublishedProjectId] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((response) => {
        if (active) setAuthState(response.ok ? "authenticated" : "guest");
      })
      .catch(() => {
        if (active) setAuthState("guest");
      });
    return () => {
      active = false;
    };
  }, []);

  const toggleTechnology = (technology: string) => {
    setTechnologies((current) =>
      current.includes(technology)
        ? current.filter((item) => item !== technology)
        : current.length < 20
          ? [...current, technology]
          : current,
    );
  };

  const addCustomTechnology = () => {
    const technology = customTechnology.trim();
    if (
      technology &&
      technology.length <= 40 &&
      !technologies.includes(technology) &&
      technologies.length < 20
    ) {
      setTechnologies((current) => [...current, technology]);
      setCustomTechnology("");
    }
  };

  const selectImages = (files: FileList | null) => {
    if (!files) return;
    const selected = Array.from(files);
    if (images.length + selected.length > MAX_SCREENSHOTS) {
      setError(`Tu peux ajouter jusqu’à ${MAX_SCREENSHOTS} captures.`);
      return;
    }
    const invalid = selected.find(
      (file) =>
        !ALLOWED_IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_SIZE,
    );
    if (invalid) {
      setError(
        "Chaque capture doit être en JPG, PNG ou WebP et faire 2 Mo maximum.",
      );
      return;
    }
    setError("");
    setImages((current) => [...current, ...selected]);
  };

  const uploadImages = async () => {
    const paths: string[] = [];
    for (const file of images) {
      const upload = await jsonRequest<{
        path: string;
        signedUrl: string;
        contentType: string;
      }>("/api/community/showcase-project-images/upload-url", {
        method: "POST",
        body: JSON.stringify({
          filename: file.name,
          size: file.size,
          contentType: file.type,
        }),
      });
      const uploaded = await fetch(upload.signedUrl, {
        method: "PUT",
        headers: { "Content-Type": upload.contentType },
        body: file,
      });
      if (!uploaded.ok)
        throw new Error(`Impossible d’envoyer la capture « ${file.name} ».`);
      const verified = await jsonRequest<{ path: string }>(
        "/api/community/showcase-project-images/verify-upload",
        {
          method: "POST",
          body: JSON.stringify({
            path: upload.path,
            size: file.size,
            contentType: file.type,
          }),
        },
      );
      paths.push(verified.path);
    }
    return paths;
  };

  const publish = async () => {
    setLoading(true);
    setError("");
    try {
      const imagePaths = await uploadImages();
      const project = await jsonRequest<{ id: string }>(
        "/api/community/showcase-projects",
        {
          method: "POST",
          body: JSON.stringify({
            title,
            description,
            link: link.trim() || undefined,
            technologies,
            imagePaths,
          }),
        },
      );
      setPublishedProjectId(project.id);
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "Impossible de partager le projet.",
      );
    } finally {
      setLoading(false);
    }
  };

  if (authState === "checking") {
    return (
      <div className="mx-auto flex max-w-xl justify-center px-4 py-20">
        <LoaderCircle className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (authState === "guest") {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="font-bricolage text-2xl font-bold">
          Connecte-toi pour partager ton projet
        </h1>
        <p className="mt-2 text-muted-foreground">
          La présentation d’un projet est réservée aux membres.
        </p>
        <Button asChild className="mt-6">
          <Link href="/connexion?redirect=/projets/nouveau">Se connecter</Link>
        </Button>
      </div>
    );
  }

  if (publishedProjectId) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <CheckCircle2 className="mx-auto mb-5 h-16 w-16 text-primary" />
        <h1 className="font-bricolage text-2xl font-bold">Projet partagé !</h1>
        <p className="mb-8 mt-2 text-muted-foreground">
          Il est maintenant visible par la communauté. Les membres peuvent
          l’aimer et le commenter.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href={`/projets/${publishedProjectId}`}>Voir mon projet</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/projets">Tous les projets</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <Link
        href="/projets"
        className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Retour aux projets
      </Link>
      <div className="mb-8">
        <p className="mb-1 text-sm font-semibold text-primary">Communauté</p>
        <h1 className="font-bricolage text-3xl font-bold">
          Partager mon projet
        </h1>
        <p className="mt-2 text-muted-foreground">
          Présente un projet personnel. Il sera visible tout de suite et chacun
          pourra réagir.
        </p>
      </div>

      <div className="mb-8 flex items-center gap-3">
        {(["Informations", "Captures", "Publication"] as const).map(
          (label, index) => {
            const number = (index + 1) as Step;
            return (
              <div key={label} className="flex flex-1 items-center gap-2">
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    step >= number
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {step > number ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    number
                  )}
                </span>
                <span
                  className={cn(
                    "hidden text-xs font-medium sm:block",
                    step >= number
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {label}
                </span>
                {index < 2 && (
                  <span className="h-0.5 flex-1 rounded-full bg-border" />
                )}
              </div>
            );
          },
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="mb-5 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-6">
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Nom du projet *
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={180}
              placeholder="Ex. SenShop — boutique pour artisans"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Description *
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={5000}
              minLength={10}
              rows={5}
              placeholder="Quel problème ton projet résout-il ? Comment fonctionne-t-il ?"
              className="w-full resize-y rounded-xl border bg-background px-4 py-3 text-sm font-normal focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold">
              Technologies utilisées
            </span>
            <div className="flex flex-wrap gap-2">
              {TECH_SUGGESTIONS.map((technology) => (
                <button
                  key={technology}
                  type="button"
                  onClick={() => toggleTechnology(technology)}
                  aria-pressed={technologies.includes(technology)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm transition-colors",
                    technologies.includes(technology)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:border-primary hover:text-primary",
                  )}
                >
                  {technology}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={customTechnology}
                onChange={(event) => setCustomTechnology(event.target.value)}
                maxLength={40}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addCustomTechnology();
                  }
                }}
                placeholder="Autre technologie…"
              />
              <Button
                type="button"
                variant="outline"
                onClick={addCustomTechnology}
              >
                Ajouter
              </Button>
            </div>
            {technologies.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {technologies.map((technology) => (
                  <Badge key={technology} variant="outline">
                    {technology}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Lien de démonstration ou GitHub (facultatif)
            <Input
              type="url"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              maxLength={2048}
              placeholder="https://github.com/ton-projet"
            />
          </label>
          <div className="flex justify-end border-t pt-4">
            <Button
              onClick={() => setStep(2)}
              disabled={
                title.trim().length < 2 || description.trim().length < 10
              }
            >
              Suivant <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="font-semibold">Captures d’écran</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ajoute jusqu’à cinq images JPG, PNG ou WebP (2 Mo maximum
              chacune).
            </p>
            <label className="mt-4 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed p-8 text-center transition-colors hover:border-primary">
              <ImagePlus className="mb-3 h-8 w-8 text-primary" />
              <span className="text-sm font-semibold">
                Choisir des captures
              </span>
              <span className="mt-1 text-xs text-muted-foreground">
                {images.length}/{MAX_SCREENSHOTS} sélectionnée(s)
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                onChange={(event) => {
                  selectImages(event.target.files);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            {images.length > 0 && (
              <ul className="mt-4 flex flex-col gap-2">
                {images.map((image, index) => (
                  <li
                    key={`${image.name}-${image.lastModified}-${index}`}
                    className="flex items-center justify-between gap-3 rounded-xl border p-3 text-sm"
                  >
                    <span className="truncate">
                      {image.name}{" "}
                      <span className="text-xs text-muted-foreground">
                        ({(image.size / 1024 / 1024).toFixed(1)} Mo)
                      </span>
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Retirer ${image.name}`}
                      onClick={() =>
                        setImages((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index),
                        )
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-xl bg-muted/50 p-4 text-sm text-muted-foreground">
            Les captures rendent ton projet plus facile à découvrir. Évite d’y
            afficher des mots de passe ou des informations personnelles.
          </div>
          <div className="flex items-center justify-between border-t pt-4">
            <Button variant="outline" onClick={() => setStep(1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
            <Button onClick={() => setStep(3)}>
              Suivant <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="mb-4 font-bricolage text-lg font-bold">
              Récapitulatif
            </h2>
            <dl className="flex flex-col gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">Projet</dt>
                <dd className="font-semibold">{title}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Description</dt>
                <dd className="line-clamp-3">{description}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Technologies</dt>
                <dd>
                  {technologies.length
                    ? technologies.join(", ")
                    : "Non précisées"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Captures</dt>
                <dd>{images.length || "Aucune"}</dd>
              </div>
              {link && (
                <div>
                  <dt className="text-muted-foreground">Lien</dt>
                  <dd className="break-all text-primary">{link}</dd>
                </div>
              )}
            </dl>
          </div>
          <p className="rounded-xl border bg-muted/50 p-4 text-sm text-muted-foreground">
            En partageant ce projet, tu confirmes que tu as le droit de publier
            son contenu. Il sera visible immédiatement par la communauté.
          </p>
          <div className="flex items-center justify-between border-t pt-4">
            <Button variant="outline" onClick={() => setStep(2)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
            <Button
              onClick={() => void publish()}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {loading ? "Publication…" : "Partager le projet"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
