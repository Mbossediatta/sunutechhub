"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import {
  Check,
  Code2,
  Lightbulb,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { sandboxTipHtml } from "@/lib/sandbox-tip-html";

type Tip = {
  id: string;
  slug: string;
  title: string;
  description: string;
  htmlContent: string;
  narrationPath: string | null;
  published: boolean;
  updatedAt: string;
};

type TipForm = {
  title: string;
  description: string;
  htmlContent: string;
  narrationPath: string;
  published: boolean;
};

const emptyForm: TipForm = {
  title: "",
  description: "",
  htmlContent: "",
  narrationPath: "",
  published: false,
};

const MAX_HTML_SIZE = 40_000;
const MAX_NARRATION_SIZE = 50 * 1024 * 1024;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/admin/${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      result &&
      typeof result === "object" &&
      "message" in result &&
      typeof result.message === "string"
        ? result.message
        : "La requête n’a pas abouti.";
    throw new Error(message);
  }
  return result as T;
}

function messageOf(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function AdminAstucesPage() {
  const [tips, setTips] = useState<Tip[]>([]);
  const [form, setForm] = useState<TipForm>(emptyForm);
  const [htmlFile, setHtmlFile] = useState<File | null>(null);
  const [narrationFile, setNarrationFile] = useState<File | null>(null);
  const [htmlInputKey, setHtmlInputKey] = useState(0);
  const [narrationInputKey, setNarrationInputKey] = useState(0);
  const [editing, setEditing] = useState<Tip | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadTips = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await request<Tip[]>("tips");
      if (!Array.isArray(result)) {
        throw new Error("La réponse des astuces est invalide.");
      }
      setTips(result);
    } catch (loadError) {
      setError(messageOf(loadError, "Impossible de charger les astuces."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadTips);
  }, [loadTips]);

  const resetForm = () => {
    setEditing(null);
    setForm(emptyForm);
    setHtmlFile(null);
    setNarrationFile(null);
    setHtmlInputKey((key) => key + 1);
    setNarrationInputKey((key) => key + 1);
  };

  const beginEdit = (tip: Tip) => {
    setEditing(tip);
    setForm({
      title: tip.title,
      description: tip.description,
      htmlContent: tip.htmlContent,
      narrationPath: tip.narrationPath ?? "",
      published: tip.published,
    });
    setHtmlFile(null);
    setNarrationFile(null);
    setHtmlInputKey((key) => key + 1);
    setNarrationInputKey((key) => key + 1);
    setError("");
    setNotice("");
  };

  const saveTip = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    if (!form.htmlContent.trim() || form.htmlContent.length > MAX_HTML_SIZE) {
      setError("Le fichier HTML doit contenir au maximum 40 Ko de code.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    let uploadedPath: string | null = null;
    try {
      let narrationPath = form.narrationPath;
      if (narrationFile) {
        const narrationContentType = narrationFile.name
          .toLowerCase()
          .endsWith(".mp3")
          ? "audio/mpeg"
          : "video/mp4";
        const upload = await request<{
          path: string;
          signedUrl: string;
        }>("tips/narration/upload-url", {
          method: "POST",
          body: JSON.stringify({
            filename: narrationFile.name,
            size: narrationFile.size,
            contentType: narrationContentType,
          }),
        });
        uploadedPath = upload.path;
        const storageResponse = await fetch(upload.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": narrationContentType },
          body: narrationFile,
          credentials: "omit",
        });
        if (!storageResponse.ok) {
          throw new Error(
            "Le téléversement audio a échoué. Vérifiez le bucket et les paramètres CORS Supabase.",
          );
        }

        const verified = await request<{ path: string }>(
          "tips/narration/verify-upload",
          {
            method: "POST",
            body: JSON.stringify({
              path: upload.path,
              size: narrationFile.size,
              contentType: narrationContentType,
            }),
          },
        );
        narrationPath = verified.path;
      }

      const body = JSON.stringify({
        title: form.title,
        description: form.description,
        htmlContent: form.htmlContent,
        narrationPath: narrationPath || null,
        published: form.published,
      });
      const saved = await request<Tip>(
        editing ? `tips/${encodeURIComponent(editing.id)}` : "tips",
        { method: editing ? "PATCH" : "POST", body },
      );
      uploadedPath = null;
      setTips((current) =>
        editing
          ? current.map((tip) => (tip.id === saved.id ? saved : tip))
          : [saved, ...current],
      );
      setNotice(
        saved.published
          ? "Astuce enregistrée et publiée. Elle est visible publiquement."
          : "Astuce enregistrée en brouillon.",
      );
      resetForm();
    } catch (saveError) {
      let failure = messageOf(saveError, "Impossible d’enregistrer l’astuce.");
      if (uploadedPath) {
        try {
          await request("tips/narration", {
            method: "DELETE",
            body: JSON.stringify({ path: uploadedPath }),
          });
        } catch (cleanupError) {
          failure += ` Le fichier audio temporaire n’a pas pu être supprimé : ${messageOf(cleanupError, "erreur inconnue")}`;
        }
      }
      setError(failure);
    } finally {
      setSaving(false);
    }
  };

  const deleteTip = async (tip: Tip) => {
    if (!window.confirm(`Supprimer définitivement « ${tip.title} » ?`)) return;
    setDeletingId(tip.id);
    setError("");
    setNotice("");
    try {
      await request(`tips/${encodeURIComponent(tip.id)}`, {
        method: "DELETE",
      });
      setTips((current) => current.filter((item) => item.id !== tip.id));
      if (editing?.id === tip.id) resetForm();
      setNotice("Astuce supprimée.");
    } catch (deleteError) {
      setError(messageOf(deleteError, "Impossible de supprimer l’astuce."));
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <header>
        <h1 className="font-bricolage text-2xl font-bold">Astuces animées</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Publiez gratuitement une animation HTML. Les astuces publiées sont
          accessibles à tous, sans compte.
        </p>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary"
        >
          <Check className="h-4 w-4" /> {notice}
        </p>
      )}

      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Lightbulb className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-bricolage text-lg font-bold">
                {editing ? "Modifier une astuce" : "Créer une astuce"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Animation HTML autonome. La voix off est facultative.
              </p>
            </div>
          </div>

          <form onSubmit={saveTip} className="grid gap-4">
            <Input
              required
              minLength={2}
              maxLength={180}
              placeholder="Titre de l’astuce"
              value={form.title}
              onChange={(event) =>
                setForm({ ...form, title: event.target.value })
              }
            />
            <textarea
              maxLength={2000}
              rows={2}
              placeholder="Résumé (facultatif)"
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              className="rounded-xl border border-input bg-background px-4 py-3 text-sm"
            />
            <label className="flex flex-col gap-2 text-sm font-medium">
              Fichier HTML de l’animation (40 Ko maximum)
              <input
                key={htmlInputKey}
                type="file"
                accept=".html,.htm,text/html"
                onChange={async (event) => {
                  const file = event.target.files?.[0] ?? null;
                  if (!file) return;
                  if (
                    !/\.(html|htm)$/i.test(file.name) ||
                    file.size > MAX_HTML_SIZE
                  ) {
                    setError(
                      "Choisissez un fichier .html ou .htm de 40 Ko maximum.",
                    );
                    event.target.value = "";
                    return;
                  }
                  try {
                    const htmlContent = await file.text();
                    if (!htmlContent.trim()) {
                      throw new Error("Le fichier HTML est vide.");
                    }
                    setForm({ ...form, htmlContent });
                    setHtmlFile(file);
                    setError("");
                  } catch (fileError) {
                    setError(
                      messageOf(
                        fileError,
                        "Impossible de lire le fichier HTML.",
                      ),
                    );
                    event.target.value = "";
                  }
                }}
                className="rounded-xl border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground"
              />
              <span className="text-xs font-normal text-muted-foreground">
                Le HTML est affiché dans un cadre isolé. Pour la sécurité,
                l’animation doit être autonome : scripts, styles et images
                doivent être intégrés au fichier, sans ressources externes.
                {htmlFile ? ` Fichier choisi : ${htmlFile.name}` : ""}
              </span>
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium">
              Voix off facultative (MP3 ou MP4)
              <input
                key={narrationInputKey}
                type="file"
                accept="audio/mpeg,.mp3,video/mp4,.mp4"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  const isMp3 = file?.name.toLowerCase().endsWith(".mp3");
                  const isMp4 = file?.name.toLowerCase().endsWith(".mp4");
                  if (
                    file &&
                    ((!isMp3 && !isMp4) ||
                      !["", "video/mp4", "audio/mpeg", "audio/mp3"].includes(
                        file.type,
                      ) ||
                      file.size > MAX_NARRATION_SIZE)
                  ) {
                    setError(
                      "Choisissez un fichier audio MP3 ou vidéo MP4 de 50 Mo maximum.",
                    );
                    event.target.value = "";
                    setNarrationFile(null);
                    return;
                  }
                  setError("");
                  setNarrationFile(file);
                }}
                className="rounded-xl border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground"
              />
              <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                <Volume2 className="h-3.5 w-3.5" />
                {narrationFile
                  ? `Fichier choisi : ${narrationFile.name}`
                  : form.narrationPath
                    ? "La voix off actuelle sera conservée si vous n’en choisissez pas une autre."
                    : "Vous pourrez ajouter une voix off plus tard."}
              </span>
              {form.narrationPath && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-fit"
                  onClick={() => setForm({ ...form, narrationPath: "" })}
                >
                  Retirer la voix off
                </Button>
              )}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(event) =>
                  setForm({ ...form, published: event.target.checked })
                }
              />
              Publier immédiatement — visible de tous sans connexion
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                ) : editing ? (
                  <Pencil className="mr-2 h-4 w-4" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {saving
                  ? "Enregistrement…"
                  : editing
                    ? "Enregistrer les modifications"
                    : "Créer l’astuce"}
              </Button>
              {editing && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Annuler
                </Button>
              )}
            </div>
            {form.htmlContent && (
              <div className="grid gap-4">
                <label className="flex flex-col gap-2 text-sm font-medium">
                  Code HTML chargé
                  <textarea
                    maxLength={MAX_HTML_SIZE}
                    rows={8}
                    value={form.htmlContent}
                    onChange={(event) =>
                      setForm({ ...form, htmlContent: event.target.value })
                    }
                    className="rounded-xl border border-input bg-background px-4 py-3 font-mono text-xs"
                  />
                </label>
                <section aria-label="Aperçu de l’astuce">
                  <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                    <Code2 className="h-4 w-4 text-primary" />
                    Aperçu de l’animation
                  </h3>
                  <div className="overflow-hidden rounded-xl border bg-white">
                    <iframe
                      title={`Aperçu de l’astuce ${form.title || "en cours de création"}`}
                      srcDoc={sandboxTipHtml(form.htmlContent)}
                      sandbox="allow-scripts"
                      referrerPolicy="no-referrer"
                      className="h-[min(60vh,520px)] min-h-[300px] w-full border-0"
                    />
                  </div>
                </section>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      <section>
        <h2 className="mb-3 font-bricolage text-lg font-bold">
          Astuces enregistrées
        </h2>
        <div className="divide-y rounded-2xl border bg-card">
          {loading ? (
            <p className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" /> Chargement…
            </p>
          ) : tips.length ? (
            tips.map((tip) => (
              <article
                key={tip.id}
                className="flex flex-wrap items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="break-words font-medium">{tip.title}</p>
                  <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <Code2 className="h-3.5 w-3.5" /> Animation HTML
                    <Volume2 className="ml-1 h-3.5 w-3.5" /> Voix MP3/MP4
                    <span>·</span>
                    {tip.published ? "Publiée" : "Brouillon"}
                  </p>
                  {tip.published && (
                    <a
                      href={`/astuces/${encodeURIComponent(tip.slug)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-xs text-primary hover:underline"
                    >
                      Voir l’astuce publique
                    </a>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => beginEdit(tip)}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Modifier
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={deletingId === tip.id}
                    onClick={() => void deleteTip(tip)}
                    aria-label={`Supprimer ${tip.title}`}
                  >
                    {deletingId === tip.id ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </article>
            ))
          ) : (
            <p className="p-6 text-sm text-muted-foreground">
              Aucune astuce pour le moment. Ajoutez votre première animation
              HTML accompagnée de sa voix off.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
