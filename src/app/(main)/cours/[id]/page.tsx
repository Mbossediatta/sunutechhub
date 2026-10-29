"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileText,
  LoaderCircle,
  Radio,
  Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { usePagination } from "@/hooks/use-pagination";

type Course = {
  id: string;
  title: string;
  description: string;
  language: string;
  level: string;
  instructorName: string;
  duration: string;
  coverImageUrl: string | null;
  lessons: number;
  subjects: string[];
  isFree: boolean;
  prices: {
    base: number;
    advanced: number;
    upgrade: number;
    attestation: number;
    accessDays: number;
    currency: string;
  };
};

type CheckoutResult = { checkoutUrl?: string | null; status?: string };
type CourseContentItem = {
  id: string;
  type: "VIDEO" | "RESOURCE" | "LIVE_SESSION";
  title: string;
  description: string;
  url: string;
  scheduledAt: string | null;
  position: number;
};
type CourseRegistration = {
  courseId: string;
  level: "BASE" | "AVANCE";
  startsAt: string | null;
  endsAt: string | null;
};
type CourseProgress = {
  courseId: string;
  total: number;
  completed: number;
  lessons: {
    id: string;
    type: CourseContentItem["type"];
    title: string;
    completedAt: string | null;
  }[];
};
type ContentAccess = "checking" | "available" | "login" | "enroll" | "error";

function price(value: number, currency: string) {
  return `${new Intl.NumberFormat("fr-FR").format(value)} ${currency}`;
}

export default function CoursDetailPage() {
  const params = useParams<{ id: string }>();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [content, setContent] = useState<CourseContentItem[]>([]);
  const [contentAccess, setContentAccess] = useState<ContentAccess>("checking");
  const [contentError, setContentError] = useState("");
  const [registration, setRegistration] = useState<CourseRegistration | null>(
    null,
  );
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [progressError, setProgressError] = useState("");
  const [workingProgressId, setWorkingProgressId] = useState("");
  const contentPagination = usePagination(content);

  const loadContent = useCallback(async (courseId: string) => {
    setContentAccess("checking");
    setContentError("");
    try {
      const response = await fetch(
        `/api/courses/${encodeURIComponent(courseId)}/content`,
        { cache: "no-store" },
      );
      const result: unknown = await response.json().catch(() => null);
      if (response.status === 401) {
        setContent([]);
        setContentAccess("login");
        return;
      }
      if (response.status === 403) {
        setContent([]);
        setContentAccess("enroll");
        return;
      }
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
      setContent(result as CourseContentItem[]);
      setContentAccess("available");
    } catch (loadError) {
      setContentError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger le contenu du cours.",
      );
      setContentAccess("error");
    }
  }, []);

  const loadRegistration = useCallback(async (courseId: string) => {
    setRegistration(null);
    try {
      const response = await fetch("/api/courses/enrollments/mine", {
        cache: "no-store",
      });
      if (!response.ok) return;
      const result: unknown = await response.json().catch(() => null);
      if (!Array.isArray(result)) return;
      const enrollments = result as CourseRegistration[];
      setRegistration(
        enrollments.find((enrollment) => enrollment.courseId === courseId) ??
          null,
      );
    } catch {
      setRegistration(null);
    }
  }, []);

  const loadProgress = useCallback(async (courseId: string) => {
    setProgress(null);
    setProgressError("");
    try {
      const response = await fetch(
        `/api/courses/${encodeURIComponent(courseId)}/progress`,
        { cache: "no-store" },
      );
      const result: unknown = await response.json().catch(() => null);
      if (response.status === 401 || response.status === 403) return;
      if (!response.ok) {
        const message =
          result &&
          typeof result === "object" &&
          "message" in result &&
          typeof result.message === "string"
            ? result.message
            : "Impossible de charger la progression.";
        throw new Error(message);
      }
      if (
        !result ||
        typeof result !== "object" ||
        !("lessons" in result) ||
        !Array.isArray(result.lessons)
      ) {
        throw new Error("La réponse de progression est invalide.");
      }
      setProgress(result as CourseProgress);
    } catch (loadError) {
      setProgressError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger la progression.",
      );
    }
  }, []);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/courses`, { cache: "no-store" });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(result))
        throw new Error("Impossible de charger le cours.");
      const found = (result as Course[]).find((item) => item.id === params.id);
      if (!found) throw new Error("Cours introuvable.");
      setCourse(found);
      await Promise.all([
        loadContent(found.id),
        loadRegistration(found.id),
        loadProgress(found.id),
      ]);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger le cours.",
      );
    } finally {
      setLoading(false);
    }
  }, [loadContent, loadProgress, loadRegistration, params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const registerFree = async () => {
    if (!course) return;
    setWorking("free");
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/courses/${encodeURIComponent(course.id)}/enroll-free`,
        { method: "POST" },
      );
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          result &&
          typeof result === "object" &&
          "message" in result &&
          typeof result.message === "string"
            ? result.message
            : "Impossible de s’inscrire à ce cours.";
        throw new Error(message);
      }
      setNotice("Ton inscription gratuite au cours est enregistrée.");
      await Promise.all([
        loadContent(course.id),
        loadRegistration(course.id),
        loadProgress(course.id),
      ]);
    } catch (registerError) {
      setError(
        registerError instanceof Error
          ? registerError.message
          : "Impossible de s’inscrire.",
      );
    } finally {
      setWorking("");
    }
  };

  const toggleLessonCompletion = async (
    contentId: string,
    completed: boolean,
  ) => {
    if (!course) return;
    setWorkingProgressId(contentId);
    setProgressError("");
    try {
      const response = await fetch(
        `/api/courses/${encodeURIComponent(course.id)}/progress/${encodeURIComponent(contentId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed }),
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
            : "Impossible d’enregistrer la progression.";
        throw new Error(message);
      }
      setProgress(result as CourseProgress);
    } catch (updateError) {
      setProgressError(
        updateError instanceof Error
          ? updateError.message
          : "Impossible d’enregistrer la progression.",
      );
    } finally {
      setWorkingProgressId("");
    }
  };

  const checkout = async (
    object: "INSCRIPTION_BASE" | "INSCRIPTION_AVANCE" | "ATTESTATION",
  ) => {
    if (!course) return;
    setWorking(object);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course.id, object }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          result &&
          typeof result === "object" &&
          "message" in result &&
          typeof result.message === "string"
            ? result.message
            : "Impossible de démarrer le paiement.";
        throw new Error(message);
      }
      const payment = result as CheckoutResult;
      if (payment.checkoutUrl) {
        const checkoutUrl = new URL(payment.checkoutUrl);
        if (
          checkoutUrl.protocol !== "https:" &&
          checkoutUrl.protocol !== "http:"
        ) {
          throw new Error("Lien de paiement invalide.");
        }
        window.location.assign(checkoutUrl.toString());
      } else {
        setNotice(
          "La demande a été traitée. Vérifie ton espace de paiement pour le statut.",
        );
      }
    } catch (paymentError) {
      setError(
        paymentError instanceof Error
          ? paymentError.message
          : "Impossible de démarrer le paiement.",
      );
    } finally {
      setWorking("");
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link
        href="/cours"
        className="mb-7 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Retour aux cours
      </Link>
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-accent/20 bg-accent/10 p-4 text-sm text-accent"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary"
        >
          {notice}
        </p>
      )}
      {loading ? (
        <div className="flex justify-center rounded-2xl border bg-card p-10">
          <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : course ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <section>
            {course.coverImageUrl && (
              <img
                src={course.coverImageUrl}
                alt={`Couverture du cours ${course.title}`}
                className="mb-6 aspect-video w-full rounded-2xl object-cover"
              />
            )}
            <div className="mb-3 flex flex-wrap gap-2">
              <Badge>{course.level}</Badge>
              {course.subjects.map((subject) => (
                <Badge key={subject} variant="outline">
                  {subject}
                </Badge>
              ))}
            </div>
            <h1 className="font-bricolage text-3xl font-bold">
              {course.title}
            </h1>
            <p className="mt-4 whitespace-pre-wrap leading-relaxed text-muted-foreground">
              {course.description}
            </p>
            <dl className="mt-6 grid grid-cols-2 gap-3 rounded-2xl border bg-card p-5 text-sm">
              <div>
                <dt className="text-muted-foreground">Formateur</dt>
                <dd className="mt-1 font-medium">{course.instructorName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Langue</dt>
                <dd className="mt-1 font-medium">{course.language}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Durée</dt>
                <dd className="mt-1 font-medium">
                  {course.duration || "Non précisée"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Leçons</dt>
                <dd className="mt-1 font-medium">{course.lessons}</dd>
              </div>
            </dl>
            <p className="mt-5 text-sm text-muted-foreground">
              {course.isFree
                ? "Ce cours est gratuit."
                : `Chaque inscription payante donne accès pendant ${course.prices.accessDays} jours à compter du paiement.`}
            </p>
            <section className="mt-8 rounded-2xl border bg-card p-5">
              <h2 className="font-bricolage text-xl font-bold">
                Leçons et séances
              </h2>
              {contentAccess === "checking" ? (
                <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <LoaderCircle className="h-4 w-4 animate-spin" /> Vérification
                  de ton inscription…
                </p>
              ) : contentAccess === "login" ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  Connecte-toi puis inscris-toi à ce cours pour accéder aux
                  vidéos, supports et séances.{" "}
                  <Link
                    href="/connexion"
                    className="font-medium text-primary hover:underline"
                  >
                    Se connecter
                  </Link>
                </p>
              ) : contentAccess === "enroll" ? (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <p className="text-sm text-muted-foreground">
                    Le contenu du cours est réservé aux membres inscrits. Après
                    avoir terminé ton inscription, actualise l’accès ici.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void loadContent(course.id)}
                  >
                    Actualiser mon accès
                  </Button>
                </div>
              ) : contentAccess === "error" ? (
                <p role="alert" className="mt-3 text-sm text-accent">
                  {contentError}
                </p>
              ) : content.length ? (
                <>
                  <ol className="mt-4 divide-y">
                    {contentPagination.pageItems.map((item) => {
                    const Icon =
                      item.type === "VIDEO"
                        ? Video
                        : item.type === "LIVE_SESSION"
                          ? Radio
                          : FileText;
                    const label =
                      item.type === "VIDEO"
                        ? "Leçon vidéo"
                        : item.type === "LIVE_SESSION"
                          ? "Séance en direct"
                          : "Support de cours";
                    const completedAt = progress?.lessons.find(
                      (lesson) => lesson.id === item.id,
                    )?.completedAt;
                    return (
                      <li
                        key={item.id}
                        className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex items-start gap-3">
                          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <div>
                            <p className="font-medium">{item.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {label}
                              {item.scheduledAt &&
                                ` · ${new Intl.DateTimeFormat("fr-FR", {
                                  dateStyle: "long",
                                  timeStyle: "short",
                                }).format(new Date(item.scheduledAt))}`}
                            </p>
                            {item.description && (
                              <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 sm:ml-7">
                          <a
                            href={
                              item.url.startsWith("storage://")
                                ? `/api/courses/${encodeURIComponent(course.id)}/content/${encodeURIComponent(item.id)}/file`
                                : item.url
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                          >
                            {item.type === "LIVE_SESSION"
                              ? "Rejoindre la séance"
                              : "Ouvrir la ressource"}
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                          <Button
                            type="button"
                            size="sm"
                            variant={completedAt ? "secondary" : "outline"}
                            disabled={workingProgressId === item.id}
                            onClick={() =>
                              void toggleLessonCompletion(item.id, !completedAt)
                            }
                          >
                            {workingProgressId === item.id ? (
                              <LoaderCircle className="h-4 w-4 animate-spin" />
                            ) : completedAt ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : null}
                            {completedAt ? "Terminée" : "Marquer terminée"}
                          </Button>
                        </div>
                      </li>
                    );
                    })}
                  </ol>
                  <PaginationControls
                    page={contentPagination.page}
                    pageSize={contentPagination.pageSize}
                    totalItems={contentPagination.totalItems}
                    totalPages={contentPagination.totalPages}
                    onPageChange={contentPagination.setPage}
                    onPageSizeChange={contentPagination.setPageSize}
                  />
                </>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  Aucun contenu n’a encore été publié pour ce cours.
                </p>
              )}
              {content.length > 0 && (
                <>
                  {progress && (
                    <div className="mt-4 rounded-xl bg-muted/50 p-4">
                      <p className="flex items-center gap-2 text-sm font-medium">
                        <CheckCircle2 className="h-4 w-4 text-primary" />
                        Progression : {progress.completed}/{progress.total}{" "}
                        contenus terminés
                      </p>
                      <div
                        className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={progress.total}
                        aria-valuenow={progress.completed}
                        aria-label="Progression du cours"
                      >
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{
                            width: `${progress.total ? (progress.completed / progress.total) * 100 : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  {progressError && (
                    <p role="alert" className="mt-3 text-sm text-accent">
                      {progressError}
                    </p>
                  )}
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Les liens de séance apparaissent ici pour les membres
                    inscrits.
                  </p>
                </>
              )}
            </section>
          </section>

          <Card className="h-fit lg:sticky lg:top-24">
            <CardContent className="flex flex-col gap-4 p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <BookOpen className="h-5 w-5" />
              </span>
              {contentAccess === "available" ? (
                <>
                  <p className="text-sm font-semibold text-primary">
                    Inscription active
                  </p>
                  {registration?.endsAt && (
                    <p className="text-xs text-muted-foreground">
                      Accès jusqu’au{" "}
                      {new Intl.DateTimeFormat("fr-FR", {
                        dateStyle: "long",
                      }).format(new Date(registration.endsAt))}
                    </p>
                  )}
                  {registration?.level === "BASE" && !course.isFree && (
                    <>
                      <p className="text-sm text-muted-foreground">
                        Ton accès de base est actif. Tu peux passer à la version
                        avancée si tu le souhaites.
                      </p>
                      <Button
                        disabled={working !== ""}
                        onClick={() => void checkout("INSCRIPTION_AVANCE")}
                      >
                        {working === "INSCRIPTION_AVANCE" && (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        )}
                        Passer à la version avancée —{" "}
                        {price(course.prices.upgrade, course.prices.currency)}
                      </Button>
                    </>
                  )}
                  {(!registration || registration.level === "AVANCE") && (
                    <p className="text-sm text-muted-foreground">
                      Ton inscription est à jour. Tu n’as pas besoin de payer de
                      nouveau pour accéder à ce cours.
                    </p>
                  )}
                </>
              ) : contentAccess === "login" ? (
                <p className="text-sm text-muted-foreground">
                  Connecte-toi pour vérifier ton inscription et accéder aux
                  options de paiement.{" "}
                  <Link
                    href="/connexion"
                    className="font-medium text-primary hover:underline"
                  >
                    Se connecter
                  </Link>
                </p>
              ) : contentAccess === "checking" || contentAccess === "error" ? (
                <p className="text-sm text-muted-foreground">
                  {contentAccess === "checking"
                    ? "Vérification de ton inscription…"
                    : "Impossible de vérifier ton inscription. Actualise la page avant tout nouveau paiement."}
                </p>
              ) : course.isFree ? (
                <Button
                  disabled={working !== ""}
                  onClick={() => void registerFree()}
                >
                  {working === "free" && (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  )}
                  S’inscrire gratuitement
                </Button>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    Choisissez Wave ou Orange Money sur la page sécurisée
                    PayTech.
                  </p>
                  <Button
                    variant="outline"
                    disabled={working !== ""}
                    onClick={() => void checkout("INSCRIPTION_BASE")}
                  >
                    {working === "INSCRIPTION_BASE" && (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    )}
                    Version de base —{" "}
                    {price(course.prices.base, course.prices.currency)}
                  </Button>
                  <Button
                    disabled={working !== ""}
                    onClick={() => void checkout("INSCRIPTION_AVANCE")}
                  >
                    {working === "INSCRIPTION_AVANCE" && (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    )}
                    Version avancée —{" "}
                    {price(course.prices.advanced, course.prices.currency)}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Si ton accès de base est actif, le passage à la version
                    avancée est facturé{" "}
                    {price(course.prices.upgrade, course.prices.currency)}.
                  </p>
                  <div className="border-t pt-4">
                    <p className="flex items-start gap-2 text-xs text-muted-foreground">
                      <BadgeCheck className="h-4 w-4 shrink-0 text-primary" />
                      Attestation de réussite après validation du projet :{" "}
                      {price(course.prices.attestation, course.prices.currency)}
                      .
                    </p>
                    <Button
                      className="mt-3 w-full"
                      variant="secondary"
                      disabled={working !== ""}
                      onClick={() => void checkout("ATTESTATION")}
                    >
                      {working === "ATTESTATION" && (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      )}
                      Acheter l’attestation de réussite
                    </Button>
                  </div>
                  <p className="text-center text-xs text-muted-foreground">
                    Aucun prélèvement automatique.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
