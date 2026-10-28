"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  FileText,
  LoaderCircle,
  Pencil,
  Plus,
  Radio,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ContentType = "VIDEO" | "RESOURCE" | "LIVE_SESSION";

type CourseContent = {
  id: string;
  type: ContentType;
  title: string;
  description: string;
  url: string;
  scheduledAt: string | null;
  position: number;
  published: boolean;
};

type ContentForm = {
  type: ContentType;
  title: string;
  description: string;
  url: string;
  scheduledAt: string;
  position: string;
  published: boolean;
};

const emptyForm: ContentForm = {
  type: "VIDEO",
  title: "",
  description: "",
  url: "",
  scheduledAt: "",
  position: "0",
  published: true,
};

const typeLabels: Record<ContentType, string> = {
  VIDEO: "Leçon vidéo",
  RESOURCE: "Support de cours",
  LIVE_SESSION: "Séance en direct",
};

function localDateTime(value: string) {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function ContentIcon({ type }: { type: ContentType }) {
  if (type === "VIDEO") return <Video className="h-4 w-4 text-primary" />;
  if (type === "LIVE_SESSION") return <Radio className="h-4 w-4 text-accent" />;
  return <FileText className="h-4 w-4 text-primary" />;
}

export function CourseContentManager({
  courseId,
  courseTitle,
  onClose,
}: {
  courseId: string;
  courseTitle: string;
  onClose: () => void;
}) {
  const [contents, setContents] = useState<CourseContent[]>([]);
  const [form, setForm] = useState<ContentForm>(emptyForm);
  const [editing, setEditing] = useState<CourseContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/courses/${encodeURIComponent(courseId)}/content`,
        { cache: "no-store" },
      );
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          result &&
          typeof result === "object" &&
          "message" in result &&
          typeof result.message === "string"
            ? result.message
            : "Impossible de charger le contenu du cours.";
        throw new Error(message);
      }
      if (!Array.isArray(result)) {
        throw new Error("La réponse du contenu du cours est invalide.");
      }
      setContents(result as CourseContent[]);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger le contenu du cours.",
      );
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const beginEdit = (content: CourseContent) => {
    setEditing(content);
    setForm({
      type: content.type,
      title: content.title,
      description: content.description,
      url: content.url,
      scheduledAt: content.scheduledAt
        ? localDateTime(content.scheduledAt)
        : "",
      position: String(content.position),
      published: content.published,
    });
    setError("");
    setNotice("");
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const position = Number(form.position);
    if (!Number.isSafeInteger(position) || position < 0) {
      setError("La position doit être un entier positif.");
      return;
    }
    if (form.type === "LIVE_SESSION" && !form.scheduledAt) {
      setError("Indique la date et l’heure de la séance en direct.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    try {
      const payload = {
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim(),
        url: form.url.trim(),
        scheduledAt:
          form.type === "LIVE_SESSION"
            ? new Date(form.scheduledAt).toISOString()
            : null,
        position,
        published: form.published,
      };
      const endpoint = editing
        ? `/api/admin/courses/${encodeURIComponent(courseId)}/content/${encodeURIComponent(editing.id)}`
        : `/api/admin/courses/${encodeURIComponent(courseId)}/content`;
      const response = await fetch(endpoint, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          result &&
          typeof result === "object" &&
          "message" in result &&
          typeof result.message === "string"
            ? result.message
            : "Impossible d’enregistrer ce contenu.";
        throw new Error(message);
      }
      setEditing(null);
      setForm(emptyForm);
      setNotice(
        editing
          ? "Le contenu du cours a été modifié."
          : "Le contenu a été ajouté au cours.",
      );
      await load();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Impossible d’enregistrer ce contenu.",
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (content: CourseContent) => {
    if (!window.confirm(`Supprimer « ${content.title} » de ce cours ?`)) return;
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/admin/courses/${encodeURIComponent(courseId)}/content/${encodeURIComponent(content.id)}`,
        { method: "DELETE" },
      );
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          result &&
          typeof result === "object" &&
          "message" in result &&
          typeof result.message === "string"
            ? result.message
            : "Impossible de supprimer ce contenu.";
        throw new Error(message);
      }
      if (editing?.id === content.id) {
        setEditing(null);
        setForm(emptyForm);
      }
      setNotice("Le contenu a été supprimé.");
      await load();
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Impossible de supprimer ce contenu.",
      );
    }
  };

  return (
    <section className="rounded-2xl border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bricolage text-lg font-bold">
            Contenu de « {courseTitle} »
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Ajoute des vidéos, des supports et des liens de séances. Les
            contenus publiés sont réservés aux membres inscrits.
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" /> Fermer
        </Button>
      </div>

      {error && (
        <p
          role="alert"
          className="mb-3 rounded-xl border border-accent/20 bg-accent/10 p-3 text-sm text-accent"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="mb-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm text-primary"
        >
          {notice}
        </p>
      )}

      <form onSubmit={save} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
        <h3 className="font-semibold sm:col-span-2">
          {editing ? "Modifier un contenu" : "Ajouter une leçon ou séance"}
        </h3>
        <label className="flex flex-col gap-1.5 text-sm">
          Type de contenu
          <select
            value={form.type}
            onChange={(event) =>
              setForm({
                ...form,
                type: event.target.value as ContentType,
                scheduledAt:
                  event.target.value === "LIVE_SESSION"
                    ? form.scheduledAt
                    : "",
              })
            }
            className="h-11 rounded-xl border border-input bg-background px-3"
          >
            {Object.entries(typeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <Input
          required
          minLength={2}
          maxLength={180}
          placeholder="Titre"
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
        />
        <Input
          required
          type="url"
          maxLength={2048}
          placeholder="Lien HTTPS vers la vidéo, le support ou la séance"
          value={form.url}
          onChange={(event) => setForm({ ...form, url: event.target.value })}
          className="sm:col-span-2"
        />
        {form.type === "LIVE_SESSION" && (
          <label className="flex flex-col gap-1.5 text-sm">
            Date et heure de la séance
            <Input
              required
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(event) =>
                setForm({ ...form, scheduledAt: event.target.value })
              }
            />
          </label>
        )}
        <Input
          type="number"
          min={0}
          step={1}
          placeholder="Ordre d’affichage (0 en premier)"
          value={form.position}
          onChange={(event) =>
            setForm({ ...form, position: event.target.value })
          }
        />
        <textarea
          maxLength={2000}
          rows={3}
          placeholder="Description ou consignes (facultatif)"
          value={form.description}
          onChange={(event) =>
            setForm({ ...form, description: event.target.value })
          }
          className="rounded-xl border border-input bg-background px-4 py-3 text-sm sm:col-span-2"
        />
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(event) =>
              setForm({ ...form, published: event.target.checked })
            }
          />
          Publié et visible aux membres inscrits
        </label>
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="submit" disabled={saving}>
            {saving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {editing ? "Enregistrer" : "Ajouter au cours"}
          </Button>
          {editing && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditing(null);
                setForm(emptyForm);
              }}
            >
              Annuler
            </Button>
          )}
        </div>
      </form>

      <div className="mt-4 divide-y rounded-xl border">
        {loading ? (
          <p className="flex items-center justify-center gap-2 p-5 text-sm text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" /> Chargement…
          </p>
        ) : contents.length ? (
          contents.map((content) => (
            <article
              key={content.id}
              className="flex flex-wrap items-center justify-between gap-3 p-3"
            >
              <div className="flex min-w-0 items-start gap-2.5">
                <ContentIcon type={content.type} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{content.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {typeLabels[content.type]} · position {content.position} ·{" "}
                    {content.published ? "Publié" : "Brouillon"}
                    {content.scheduledAt &&
                      ` · ${new Intl.DateTimeFormat("fr-FR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(content.scheduledAt))}`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => beginEdit(content)}
                >
                  <Pencil className="h-3.5 w-3.5" /> Modifier
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={`Supprimer ${content.title}`}
                  onClick={() => void remove(content)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </article>
          ))
        ) : (
          <p className="p-5 text-center text-sm text-muted-foreground">
            Aucun contenu. Ajoute la première vidéo, le premier support ou la
            première séance.
          </p>
        )}
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarDays className="h-3.5 w-3.5" />
        Le lien HTTPS est fourni par ton service vidéo, de partage de fichiers ou
        de visioconférence.
      </p>
    </section>
  );
}
