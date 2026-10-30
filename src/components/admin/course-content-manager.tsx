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
import { PaginationControls } from "@/components/ui/pagination-controls";
import { usePagination } from "@/hooks/use-pagination";

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
  apiBase = "/api/admin/courses",
  uploadsEnabled = true,
  onClose,
}: {
  courseId: string;
  courseTitle: string;
  apiBase?: string;
  uploadsEnabled?: boolean;
  onClose: () => void;
}) {
  const [contents, setContents] = useState<CourseContent[]>([]);
  const [form, setForm] = useState<ContentForm>(emptyForm);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfInputKey, setPdfInputKey] = useState(0);
  const [editing, setEditing] = useState<CourseContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pagination = usePagination(contents);
  const contentEndpoint = `${apiBase}/${encodeURIComponent(courseId)}/content`;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(
        contentEndpoint,
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
  }, [contentEndpoint]);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const beginEdit = (content: CourseContent) => {
    setEditing(content);
    setPdfFile(null);
    setPdfInputKey((key) => key + 1);
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
    let uploadedPdfPath: string | null = null;
    try {
      let contentUrl = form.url.trim();
      if (form.type === "RESOURCE" && pdfFile) {
        const uploadResponse = await fetch(
          `${contentEndpoint}/upload-url`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: pdfFile.name,
              size: pdfFile.size,
              contentType: pdfFile.type,
            }),
          },
        );
        const uploadResult: unknown = await uploadResponse
          .json()
          .catch(() => null);
        if (
          !uploadResponse.ok ||
          !uploadResult ||
          typeof uploadResult !== "object" ||
          !("path" in uploadResult) ||
          typeof uploadResult.path !== "string" ||
          !("signedUrl" in uploadResult) ||
          typeof uploadResult.signedUrl !== "string"
        ) {
          const message =
            uploadResult &&
            typeof uploadResult === "object" &&
            "message" in uploadResult &&
            typeof uploadResult.message === "string"
              ? uploadResult.message
              : "Impossible de préparer le téléversement du PDF.";
          throw new Error(message);
        }

        const storageResponse = await fetch(uploadResult.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": "application/pdf" },
          body: pdfFile,
          credentials: "omit",
        });
        if (!storageResponse.ok) {
          throw new Error(
            "Le téléversement du PDF a échoué. Vérifie le bucket et les paramètres CORS Supabase.",
          );
        }
        uploadedPdfPath = uploadResult.path;

        const verifyResponse = await fetch(
          `${contentEndpoint}/verify-upload`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              path: uploadResult.path,
              size: pdfFile.size,
            }),
          },
        );
        const verifyResult: unknown = await verifyResponse
          .json()
          .catch(() => null);
        if (
          !verifyResponse.ok ||
          !verifyResult ||
          typeof verifyResult !== "object" ||
          !("path" in verifyResult) ||
          typeof verifyResult.path !== "string" ||
          !verifyResult.path.startsWith("storage://")
        ) {
          const message =
            verifyResult &&
            typeof verifyResult === "object" &&
            "message" in verifyResult &&
            typeof verifyResult.message === "string"
              ? verifyResult.message
              : "Le PDF téléversé n’a pas pu être vérifié.";
          throw new Error(message);
        }
        contentUrl = verifyResult.path;
      }

      const payload = {
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim(),
        url: contentUrl,
        scheduledAt:
          form.type === "LIVE_SESSION"
            ? new Date(form.scheduledAt).toISOString()
            : null,
        position,
        published: form.published,
      };
      const endpoint = editing
        ? `${contentEndpoint}/${encodeURIComponent(editing.id)}`
        : contentEndpoint;
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
      uploadedPdfPath = null;
      setEditing(null);
      setForm(emptyForm);
      setPdfFile(null);
      setPdfInputKey((key) => key + 1);
      let successNotice =
        editing
          ? "Le contenu du cours a été modifié."
          : "Le contenu a été ajouté au cours.";
      if (
        editing?.url.startsWith("storage://") &&
        editing.url !== contentUrl
      ) {
        try {
          const oldPdfCleanup = await fetch(
            `${contentEndpoint}/upload`,
            {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ path: editing.url }),
            },
          );
          if (!oldPdfCleanup.ok) {
            successNotice +=
              " L’ancien PDF n’a pas pu être supprimé du stockage; vérifie Supabase Storage.";
          }
        } catch {
          successNotice +=
            " L’ancien PDF n’a pas pu être supprimé du stockage; vérifie Supabase Storage.";
        }
      }
      setNotice(successNotice);
      await load();
    } catch (saveError) {
      let message =
        saveError instanceof Error
          ? saveError.message
          : "Impossible d’enregistrer ce contenu.";
      if (uploadedPdfPath) {
        try {
          const cleanupResponse = await fetch(
            `${contentEndpoint}/upload`,
            {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ path: uploadedPdfPath }),
            },
          );
          if (!cleanupResponse.ok) {
            message +=
              " Le PDF temporaire n’a pas pu être supprimé; vérifie Supabase Storage.";
          }
        } catch {
          message +=
            " Le PDF temporaire n’a pas pu être supprimé; vérifie Supabase Storage.";
        }
      }
      setError(message);
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
        `${contentEndpoint}/${encodeURIComponent(content.id)}`,
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
      setNotice(
        result &&
          typeof result === "object" &&
          "storageCleanupPending" in result &&
          result.storageCleanupPending === true
          ? "Le contenu a été supprimé, mais son PDF n’a pas pu être retiré de Supabase Storage."
          : "Le contenu a été supprimé.",
      );
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
            onChange={(event) => {
              const nextType = event.target.value as ContentType;
              setForm({
                ...form,
                type: nextType,
                url: form.url.startsWith("storage://") ? "" : form.url,
                scheduledAt:
                  nextType === "LIVE_SESSION" ? form.scheduledAt : "",
              });
              setPdfFile(null);
              setPdfInputKey((key) => key + 1);
            }}
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
        {!(form.type === "RESOURCE" && form.url.startsWith("storage://")) && (
          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            {form.type === "LIVE_SESSION"
              ? "Lien Google Meet ou Zoom"
              : form.type === "RESOURCE"
                ? uploadsEnabled
                  ? "Lien HTTPS du support (facultatif si tu ajoutes un PDF)"
                  : "Lien HTTPS du support"
                : "Lien HTTPS de la vidéo"}
            <Input
              required={
                form.type !== "RESOURCE" ||
                !uploadsEnabled ||
                (!pdfFile && !form.url.startsWith("storage://"))
              }
              type="url"
              maxLength={2048}
              placeholder={
                form.type === "LIVE_SESSION"
                  ? "https://meet.google.com/... ou lien Zoom"
                  : "https://..."
              }
              value={form.url}
              onChange={(event) =>
                setForm({ ...form, url: event.target.value })
              }
            />
          </label>
        )}
        {form.type === "RESOURCE" && uploadsEnabled && (
          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            {form.url.startsWith("storage://")
              ? "PDF actuellement enregistré (un nouveau fichier le remplacera)"
              : "Ou choisir un PDF depuis ton ordinateur (20 Mo maximum)"}
            {form.url.startsWith("storage://") && (
              <span className="text-xs text-muted-foreground">
                Un PDF est déjà associé à ce support.
              </span>
            )}
            <input
              key={pdfInputKey}
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                if (
                  file &&
                  (file.type !== "application/pdf" ||
                    !file.name.toLowerCase().endsWith(".pdf") ||
                    file.size > 20 * 1024 * 1024)
                ) {
                  setError("Choisis un fichier PDF de 20 Mo maximum.");
                  event.target.value = "";
                  setPdfFile(null);
                  return;
                }
                setError("");
                setPdfFile(file);
              }}
              className="rounded-xl border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-primary-foreground"
            />
            {pdfFile && (
              <span className="text-xs text-muted-foreground">
                Fichier sélectionné : {pdfFile.name}
              </span>
            )}
          </label>
        )}
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
                setPdfFile(null);
                setPdfInputKey((key) => key + 1);
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
          pagination.pageItems.map((content) => (
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
      <PaginationControls
        page={pagination.page}
        pageSize={pagination.pageSize}
        totalItems={pagination.totalItems}
        totalPages={pagination.totalPages}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
      />
      <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarDays className="h-3.5 w-3.5" />
        Les vidéos et séances utilisent un lien HTTPS. Les séances sont
        rejointes via Google Meet ou Zoom. Les PDF sont stockés en privé sur
        Supabase et accessibles temporairement aux membres inscrits.
      </p>
    </section>
  );
}
