"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  BookOpen,
  LoaderCircle,
  MessageSquare,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Question = {
  id: string;
  title: string;
  body: string;
  subjects: string[];
  status: "OPEN" | "SOLVED";
  createdAt: string;
  user: { id: string; name: string };
  _count: { answers: number };
};

type Course = {
  id: string;
  title: string;
  description: string;
  coverImageUrl: string | null;
  level: string;
  duration: string;
  language: string;
  lessons: number;
  subjects: string[];
  isFree: boolean;
  prices: { base: number; currency: string };
};

type ResourceState<T> = {
  items: T[];
  loading: boolean;
  error: string;
};

const initialState = <T,>(): ResourceState<T> => ({
  items: [],
  loading: true,
  error: "",
});

async function loadResource<T>(url: string, label: string): Promise<T[]> {
  const response = await fetch(url);
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      result &&
      typeof result === "object" &&
      "message" in result &&
      typeof result.message === "string"
        ? result.message
        : `Impossible de charger ${label}.`;
    throw new Error(message);
  }
  if (!Array.isArray(result)) throw new Error(`Réponse ${label} invalide.`);
  return result as T[];
}

export function HomeCommunity() {
  const [questions, setQuestions] = useState(initialState<Question>);
  const [courses, setCourses] = useState(initialState<Course>);

  useEffect(() => {
    let active = true;
    loadResource<Question>("/api/community/questions", "les questions")
      .then((items) => {
        if (active)
          setQuestions({ items: items.slice(0, 3), loading: false, error: "" });
      })
      .catch((error: unknown) => {
        if (active)
          setQuestions({
            items: [],
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Impossible de charger les questions.",
          });
      });

    loadResource<Course>("/api/courses", "les cours")
      .then((items) => {
        if (active)
          setCourses({ items: items.slice(0, 3), loading: false, error: "" });
      })
      .catch((error: unknown) => {
        if (active)
          setCourses({
            items: [],
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : "Impossible de charger les cours.",
          });
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-12 flex flex-col gap-12">
          <div>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-primary">
                  <MessageSquare className="h-4 w-4" /> Échanges récents
                </p>
                <h2 className="font-bricolage text-2xl font-bold">
                  Questions de la communauté
                </h2>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/questions">
                  Tout voir <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
            {questions.loading ? (
              <div className="flex justify-center rounded-2xl border bg-card p-8">
                <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : questions.error ? (
              <p
                role="alert"
                className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
              >
                {questions.error}
              </p>
            ) : questions.items.length ? (
              <div className="flex flex-col gap-3">
                {questions.items.map((question) => (
                  <Card
                    key={question.id}
                    className="transition-colors hover:border-primary/40"
                  >
                    <CardContent className="p-4">
                      <Link
                        href={`/questions/${question.id}`}
                        className="font-semibold leading-snug hover:text-primary"
                      >
                        {question.title}
                      </Link>
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                        {question.body}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {question.status === "SOLVED" && <Badge>Résolue</Badge>}
                        {question.subjects.slice(0, 3).map((subject) => (
                          <Badge key={subject} variant="outline">
                            {subject}
                          </Badge>
                        ))}
                        <span className="ml-auto text-xs text-muted-foreground">
                          {question._count.answers} réponse(s) ·{" "}
                          {question.user.name}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
                Aucune question publiée pour le moment.
              </p>
            )}
          </div>

          <div className="order-first">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-primary">
                  <BookOpen className="h-4 w-4" /> Apprendre
                </p>
                <h2 className="font-bricolage text-2xl font-bold">
                  Cours disponibles
                </h2>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/cours">
                  Tous les cours <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
            {courses.loading ? (
              <div className="flex justify-center rounded-2xl border bg-card p-8">
                <LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : courses.error ? (
              <p
                role="alert"
                className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
              >
                {courses.error}
              </p>
            ) : courses.items.length ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {courses.items.map((course) => (
                  <Card
                    key={course.id}
                    className="overflow-hidden transition-colors hover:border-primary/40"
                  >
                    <Link
                      href={`/cours/${course.id}`}
                      aria-label={`Découvrir le cours ${course.title}`}
                      className="relative block aspect-video overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-muted"
                    >
                      {course.coverImageUrl ? (
                        <Image
                          src={course.coverImageUrl}
                          alt={`Bannière du cours ${course.title}`}
                          fill
                          unoptimized
                          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                          className="object-cover transition-transform duration-300 hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <BookOpen className="h-10 w-10 text-primary/50" />
                        </div>
                      )}
                    </Link>
                    <CardContent className="p-3 sm:p-4">
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <Link
                          href={`/cours/${course.id}`}
                          className="font-semibold leading-snug hover:text-primary"
                        >
                          {course.title}
                        </Link>
                        <Badge
                          variant={course.isFree ? "secondary" : "outline"}
                        >
                          {course.isFree ? "Gratuit" : "Payant"}
                        </Badge>
                      </div>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {course.description}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span>{course.level}</span>
                        {course.duration && (
                          <>
                            <span>·</span>
                            <span>{course.duration}</span>
                          </>
                        )}
                        <span>·</span>
                        <span>{course.lessons} leçon(s)</span>
                        {!course.isFree && (
                          <span className="ml-auto font-semibold text-primary">
                            {new Intl.NumberFormat("fr-FR").format(
                              course.prices.base,
                            )}{" "}
                            {course.prices.currency}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
                Aucun cours actif pour le moment.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
