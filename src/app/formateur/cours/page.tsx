"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { BookOpen, LoaderCircle, LogOut, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CourseContentManager } from "@/components/admin/course-content-manager";
import { Input } from "@/components/ui/input";

type TrainerCourse = {
  id: string;
  title: string;
  description: string;
  active: boolean;
  _count: { registrations: number };
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
  const router = useRouter();
  const [courses, setCourses] = useState<TrainerCourse[]>([]);
  const [progress, setProgress] = useState<TrainerProgress | null>(null);
  const [loadingProgressId, setLoadingProgressId] = useState("");
  const [selected, setSelected] = useState<TrainerCourse | null>(null);
  const [editing, setEditing] = useState<TrainerCourse | null>(null);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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
    setTitle("");
    setDescription("");
    setError("");
    setNotice("");
  };

  const startEdit = (course: TrainerCourse) => {
    setEditing(course);
    setCreating(false);
    setSelected(null);
    setProgress(null);
    setTitle(course.title);
    setDescription(course.description);
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

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        editing
          ? `/api/formateur/courses/${encodeURIComponent(editing.id)}`
          : "/api/formateur/courses",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, description }),
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
      setEditing(null);
      setCreating(false);
      setNotice(
        editing
          ? "Les informations du cours ont été mises à jour."
          : "Le cours a été créé comme brouillon. Un administrateur devra le publier.",
      );
      await load();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Impossible d’enregistrer le cours.",
      );
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        setError("La déconnexion n’a pas abouti. Réessaie.");
        return;
      }
      router.replace("/admin/login");
      router.refresh();
    } catch {
      setError("Impossible de fermer la session. Réessaie.");
    }
  };

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="flex items-center justify-between border-b bg-card px-4 py-4 sm:px-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Espace formateur
          </p>
          <h1 className="font-bricolage text-xl font-bold">Mes cours</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => void logout()}>
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </Button>
      </header>

      <div className="mx-auto flex max-w-5xl flex-col gap-5 p-4 sm:p-8">
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
              <Input
                required
                minLength={3}
                maxLength={180}
                placeholder="Titre du cours"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
              <textarea
                required
                minLength={10}
                maxLength={5000}
                rows={4}
                placeholder="Description du cours"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="rounded-xl border border-input bg-background px-4 py-3 text-sm sm:col-span-2"
              />
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
                    setTitle("");
                    setDescription("");
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
                  <div className="flex gap-2">
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
                        setTitle("");
                        setDescription("");
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
    </main>
  );
}
