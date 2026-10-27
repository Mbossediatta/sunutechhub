"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, LoaderCircle, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type Course = {
  id: string;
  title: string;
  description: string;
  level: string;
  duration: string;
  language: string;
  lessons: number;
  subjects: string[];
  isFree: boolean;
  prices: {
    base: number;
    advanced: number;
    currency: string;
  };
};

export default function CoursPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("Tous");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/courses", { cache: "no-store" })
      .then(async (response) => {
        const result: unknown = await response.json().catch(() => null);
        if (!response.ok) throw new Error("Impossible de charger les cours.");
        if (!Array.isArray(result)) throw new Error("Réponse des cours invalide.");
        return result as Course[];
      })
      .then((result) => {
        if (active) setCourses(result);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Impossible de charger les cours.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const levels = useMemo(() => ["Tous", ...new Set(courses.map((course) => course.level))], [courses]);
  const visible = useMemo(
    () => courses.filter((course) => {
      const matchesLevel = level === "Tous" || course.level === level;
      const matchesSearch = `${course.title} ${course.description} ${course.subjects.join(" ")}`.toLowerCase().includes(search.toLowerCase());
      return matchesLevel && matchesSearch;
    }),
    [courses, level, search],
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-7">
        <h1 className="font-bricolage text-3xl font-bold">Cours</h1>
        <p className="mt-1 text-muted-foreground">{courses.length} cours disponibles</p>
      </header>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un cours ou un sujet" className="pl-9" />
        </div>
        <select value={level} onChange={(event) => setLevel(event.target.value)} className="h-11 rounded-xl border border-input bg-background px-3 text-sm">
          {levels.map((item) => <option key={item} value={item}>{item === "Tous" ? "Tous les niveaux" : item}</option>)}
        </select>
      </div>
      {error && <p role="alert" className="mb-4 rounded-xl border border-accent/20 bg-accent/10 p-4 text-sm text-accent">{error}</p>}
      {loading ? (
        <div className="flex justify-center rounded-2xl border bg-card p-10"><LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : visible.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((course) => (
            <article key={course.id} className="flex flex-col rounded-2xl border bg-card p-5 transition-colors hover:border-primary/40">
              <div className="mb-4 flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><BookOpen className="h-5 w-5" /></span>
                <Badge variant={course.isFree ? "secondary" : "outline"}>{course.isFree ? "Gratuit" : "Payant"}</Badge>
              </div>
              <h2 className="font-bricolage text-lg font-bold">{course.title}</h2>
              <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">{course.description}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {course.subjects.map((subject) => <Badge key={subject} variant="outline" className="text-[10px]">{subject}</Badge>)}
              </div>
              <p className="mt-4 text-xs text-muted-foreground">{course.level} · {course.duration || "Durée variable"} · {course.lessons} leçons · {course.language}</p>
              {!course.isFree && <p className="mt-3 text-sm font-semibold text-primary">{new Intl.NumberFormat("fr-FR").format(course.prices.base)} {course.prices.currency} · version de base</p>}
              <Link href={`/cours/${course.id}`} className="mt-4 inline-flex justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
                Découvrir le cours
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border bg-card p-10 text-center text-sm text-muted-foreground">
          {courses.length ? "Aucun cours ne correspond à la recherche." : "Aucun cours disponible pour le moment."}
        </p>
      )}
    </div>
  );
}
