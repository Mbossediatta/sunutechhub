"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { BookOpen, LoaderCircle, Plus, Upload, X } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { CourseContentManager } from "@/components/admin/course-content-manager";
import { Input } from "@/components/ui/input";

type TrainerCourse = {
  id: string;
  title: string;
  description: string;
  level: string;
  language: string;
  duration: string;
  coverImageUrl: string | null;
  lessons: number;
  subjects: string[];
  active: boolean;
  _count: { registrations: number };
};

type CourseForm = {
  title: string;
  description: string;
  level: string;
  language: string;
  duration: string;
  coverImageUrl: string;
  lessons: string;
  subjects: string;
};

const emptyForm: CourseForm = {
  title: "",
  description: "",
  level: "Débutant",
  language: "Français",
  duration: "",
  coverImageUrl: "",
  lessons: "0",
  subjects: "",
};

type TrainerProgress = {
  courseId: string;
  courseTitle: string;
  totalLessons: number;
  students: {
    id: string;
    name: string;
    level: "BASE" | "AVANCE";
    registeredAt: string;
    endsAt: string | null;
    completed: number;
  }[];
};

export default function TrainerCoursesPage() {
  const [courses, setCourses] = useState<TrainerCourse[]>([]);
  const [progress, setProgress] = useState<TrainerProgress | null>(null);
  const [loadingProgressId, setLoadingProgressId] = useState("");
  const [selected, setSelected] = useState<TrainerCourse | null>(null);
  const [editing, setEditing] = useState<TrainerCourse | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CourseForm>(emptyForm);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const bannerPreviewRef = useRef("");

  const selectBannerFile = (file: File | null) => {
    if (bannerPreviewRef.current) {
      URL.revokeObjectURL(bannerPreviewRef.current);
    }
    const previewUrl = file ? URL.createObjectURL(file) : "";
    bannerPreviewRef.current = previewUrl;
    setBannerPreviewUrl(previewUrl);
    setBannerFile(file);
    if (bannerInputRef.current) bannerInputRef.current.value = "";
  };

  useEffect(
    () => () => {
      if (bannerPreviewRef.current) {
        URL.revokeObjectURL(bannerPreviewRef.current);
      }
    },
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/formateur/courses", {
        cache: "no-store",
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(result)) {
        const message =
          result &&
          typeof result === "object" &&
          "message" in result &&
          typeof result.message === "string"
            ? result.message
            : "Impossible de charger tes cours.";
        throw new Error(message);
      }
      setCourses(result as TrainerCourse[]);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger tes cours.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(load);
  }, [load]);

  const startCreate = () => {
    setEditing(null);
    setCreating(true);
    setSelected(null);
    setProgress(null);
    setForm(emptyForm);
    selectBannerFile(null);
    setError("");
    setNotice("");
  };

  const startEdit = (course: TrainerCourse) => {
    setEditing(course);
    setCreating(false);
    setSelected(null);
    setProgress(null);
    setForm({
      title: course.title,
      description: course.description,
      level: course.level,
      language: course.language,
      duration: course.duration,
      coverImageUrl: course.coverImageUrl ?? "",
      lessons: String(course.lessons),
      subjects: course.subjects.join(", "),
    });
    selectBannerFile(null);
    setError("");
    setNotice("");
  };

  const loadProgress = async (course: TrainerCourse) => {
    setLoadingProgressId(course.id);
    setError("");
    setProgress(null);
    try {
      const response = await fetch(
        `/api/formateur/courses/${encodeURIComponent(course.id)}/progress`,
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
            : "Impossible de charger le suivi du cours.";
        throw new Error(message);
      }
      setProgress(result as TrainerProgress);
    } catch (progressError) {
      setError(
        progressError instanceof Error
          ? progressError.message
          : "Impossible de charger le suivi du cours.",
      );
    } finally {
      setLoadingProgressId("");
    }
  };

  const handleBannerChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (
      file &&
      (!["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 5 * 1024 * 1024)
    ) {
      setError("Choisis une image JPG, PNG ou WebP de 5 Mo maximum.");
      event.target.value = "";
      return;
    }
    setError("");
    setForm((current) => ({ ...current, coverImageUrl: "" }));
    selectBannerFile(file);
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const lessons = Number(form.lessons);
    if (!Number.isSafeInteger(lessons) || lessons < 0) {
      setError("Le nombre de leçons doit être un entier positif.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    let uploadedBannerPath: string | null = null;
    let courseSaved = false;
    try {
      let coverImageUrl: string | null = form.coverImageUrl.trim() || null;
      if (bannerFile) {
        const uploadResponse = await fetch(
          "/api/formateur/courses/banner/upload-url",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: bannerFile.name,
              size: bannerFile.size,
              contentType: bannerFile.type,
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
              : "Impossible de préparer le téléversement de la bannière.";
          throw new Error(message);
        }
        uploadedBannerPath = uploadResult.path;
        const storageResponse = await fetch(uploadResult.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": bannerFile.type },
          body: bannerFile,
          credentials: "omit",
        });
        if (!storageResponse.ok) {
          throw new Error("Le téléversement de la bannière a échoué.");
        }

        const verifyResponse = await fetch(
          "/api/formateur/courses/banner/verify-upload",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              path: uploadResult.path,
              size: bannerFile.size,
              contentType: bannerFile.type,
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
          !("coverImageUrl" in verifyResult) ||
          typeof verifyResult.coverImageUrl !== "string"
        ) {
          const message =
            verifyResult &&
            typeof verifyResult === "object" &&
            "message" in verifyResult &&
            typeof verifyResult.message === "string"
              ? verifyResult.message
              : "Impossible de vérifier la bannière téléversée.";
          throw new Error(message);
        }
        coverImageUrl = verifyResult.coverImageUrl;
      }

      const response = await fetch(
        editing
          ? `/api/formateur/courses/${encodeURIComponent(editing.id)}`
          : "/api/formateur/courses",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            lessons,
            subjects: form.subjects
              .split(",")
              .map((subject) => subject.trim())
              .filter(Boolean),
            coverImageUrl,
          }),
        },
      );
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          result &&
          typeof result === "object" &&
          "message" in result &&
          typeof result.message === "string"
            ? result.message
            : "Impossible d’enregistrer le cours.";
        throw new Error(message);
      }
      courseSaved = true;
      setEditing(null);
      setCreating(false);
      selectBannerFile(null);
      setNotice(
        editing
          ? "Les informations du cours ont été mises à jour."
          : "Le cours a été créé comme brouillon. Un administrateur devra le publier.",
      );
      await load();
    } catch (saveError) {
      let message =
        saveError instanceof Error
          ? saveError.message
          : "Impossible d’enregistrer le cours.";
      if (uploadedBannerPath && !courseSaved) {
        try {
          const cleanupResponse = await fetch(
            "/api/formateur/courses/banner/upload",
            {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ path: uploadedBannerPath }),
            },
          );
          if (!cleanupResponse.ok) {
            message +=
              " L’image temporaire n’a pas pu être supprimée automatiquement.";
          }
        } catch {
          message +=
            " L’image temporaire n’a pas pu être supprimée automatiquement.";
        }
      }
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
      <div className="mx-auto flex max-w-5xl flex-col gap-5">
        {error && (
          <p role="alert" className="rounded-xl border border-accent/20 bg-accent/10 p-4 text-sm text-accent">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary">
            {notice}
          </p>
        )}

        <section className="rounded-2xl border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bricolage text-lg font-bold">Tes cours</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Tu peux modifier tes cours et leurs leçons. Les nouveaux cours
                restent en brouillon jusqu’à leur publication par un admin.
              </p>
            </div>
            {!editing && !creating && !selected && (
              <Button onClick={startCreate}>
                <Plus className="h-4 w-4" />
                Créer un cours
              </Button>
            )}
          </div>

          {(editing || creating) && (
            <form onSubmit={save} className="mt-5 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm">
                Titre du cours
                <Input
                  required
                  minLength={3}
                  maxLength={180}
                  value={form.title}
                  onChange={(event) =>
                    setForm({ ...form, title: event.target.value })
                  }
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                Langue
                <Input
                  maxLength={100}
                  value={form.language}
                  onChange={(event) =>
                    setForm({ ...form, language: event.target.value })
                  }
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                Niveau
                <Input
                  maxLength={80}
                  value={form.level}
                  onChange={(event) =>
                    setForm({ ...form, level: event.target.value })
                  }
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                Durée (ex. 8 heures)
                <Input
                  maxLength={80}
                  value={form.duration}
                  onChange={(event) =>
                    setForm({ ...form, duration: event.target.value })
                  }
                />
              </label>
              <div className="flex flex-col gap-3 sm:col-span-2">
                <label
                  htmlFor="trainer-course-banner"
                  className="flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed bg-muted/30 px-4 py-5 text-center transition-colors hover:bg-muted/60"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Upload className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold">
                    {bannerFile
                      ? bannerFile.name
                      : "Choisir une image depuis votre ordinateur"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    JPG, PNG ou WebP · 5 Mo maximum
                  </span>
                  <input
                    ref={bannerInputRef}
                    id="trainer-course-banner"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={saving}
                    onChange={handleBannerChange}
                    className="sr-only"
                  />
                </label>
                {bannerFile && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="self-start"
                    disabled={saving}
                    onClick={() => selectBannerFile(null)}
                  >
                    <X className="h-4 w-4" />
                    Retirer l’image choisie
                  </Button>
                )}
                <label className="flex flex-col gap-1.5 text-sm">
                  Ou utiliser un lien HTTPS (facultatif)
                  <Input
                    type="url"
                    maxLength={2048}
                    placeholder="https://exemple.com/image.jpg"
                    value={form.coverImageUrl}
                    disabled={Boolean(bannerFile) || saving}
                    onChange={(event) =>
                      setForm({ ...form, coverImageUrl: event.target.value })
                    }
                  />
                </label>
              </div>
              {(bannerPreviewUrl || form.coverImageUrl.trim()) && (
                <Image
                  src={bannerPreviewUrl || form.coverImageUrl.trim()}
                  alt="Aperçu de la couverture du cours"
                  width={800}
                  height={450}
                  unoptimized
                  className="max-h-48 w-full rounded-xl border object-cover sm:col-span-2"
                />
              )}
              <label className="flex flex-col gap-1.5 text-sm">
                Nombre de leçons
                <Input
                  required
                  type="number"
                  min={0}
                  step={1}
                  value={form.lessons}
                  onChange={(event) =>
                    setForm({ ...form, lessons: event.target.value })
                  }
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                Sujets séparés par des virgules
                <Input
                  value={form.subjects}
                  onChange={(event) =>
                    setForm({ ...form, subjects: event.target.value })
                  }
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
                Description du cours
                <textarea
                  required
                  minLength={10}
                  maxLength={5000}
                  rows={4}
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  className="rounded-xl border border-input bg-background px-4 py-3 text-sm"
                />
              </label>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Le cours sera enregistré en brouillon. La publication et la
                configuration des tarifs restent réservées à un administrateur.
              </p>
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
                  {editing ? "Enregistrer" : "Créer le brouillon"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditing(null);
                    setCreating(false);
                    setForm(emptyForm);
                    selectBannerFile(null);
                  }}
                >
                  Annuler
                </Button>
              </div>
            </form>
          )}

          {loading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              <LoaderCircle className="mx-auto h-5 w-5 animate-spin" />
              Chargement des cours…
            </p>
          ) : courses.length > 0 ? (
            <ul className="mt-5 divide-y rounded-xl border">
              {courses.map((course) => (
                <li
                  key={course.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <BookOpen className="mt-1 h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="break-words font-medium">{course.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {course.active ? "Publié" : "Brouillon"} ·{" "}
                        {course._count.registrations} inscription(s)
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loadingProgressId === course.id}
                      onClick={() => void loadProgress(course)}
                    >
                      {loadingProgressId === course.id ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        "Suivi"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEdit(course)}
                    >
                      Modifier
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        setEditing(null);
                        setSelected(course);
                        setForm(emptyForm);
                        selectBannerFile(null);
                        setError("");
                      }}
                    >
                      Gérer les leçons
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : !loading && !error ? (
            <p className="mt-5 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Aucun cours pour le moment. Crée un cours pour commencer.
            </p>
          ) : null}

          {progress && (
            <section className="mt-5 rounded-xl border p-4">
              <h3 className="font-semibold">
                Progression des inscrits — {progress.courseTitle}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {progress.totalLessons} leçon(s) ou séance(s) publiées
              </p>
              {progress.students.length ? (
                <ul className="mt-3 divide-y">
                  {progress.students.map((student) => {
                    const percentage = progress.totalLessons
                      ? Math.min(
                          100,
                          Math.round(
                            (student.completed / progress.totalLessons) * 100,
                          ),
                        )
                      : 0;
                    return (
                      <li key={student.id} className="py-3">
                        <div className="flex flex-wrap justify-between gap-2 text-sm">
                          <span className="font-medium">{student.name}</span>
                          <span className="text-muted-foreground">
                            {student.completed}/{progress.totalLessons} ·{" "}
                            {percentage} %
                          </span>
                        </div>
                        <div
                          className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
                          role="progressbar"
                          aria-label={`Progression de ${student.name}`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={percentage}
                        >
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  Aucun inscrit pour le moment.
                </p>
              )}
            </section>
          )}
        </section>

        {selected && (
          <CourseContentManager
            courseId={selected.id}
            courseTitle={selected.title}
            apiBase="/api/formateur/courses"
            uploadsEnabled={false}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    );
}
