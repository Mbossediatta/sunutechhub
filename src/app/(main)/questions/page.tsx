"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, LoaderCircle, MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { usePagination } from "@/hooks/use-pagination";

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

const subjects = ["Tous", "JavaScript", "React", "Node.js", "Python", "PostgreSQL", "Flutter", "CSS", "Linux"];

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subject, setSubject] = useState("Tous");
  const [sort, setSort] = useState<"recent" | "unanswered">("recent");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/community/questions")
      .then(async (response) => {
        const result: unknown = await response.json().catch(() => null);
        if (!response.ok) throw new Error("Impossible de charger les questions.");
        if (!Array.isArray(result)) throw new Error("Réponse des questions invalide.");
        return result as Question[];
      })
      .then((result) => {
        if (active) setQuestions(result);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Impossible de charger les questions.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const visible = useMemo(() => {
    const filtered = questions.filter((question) => subject === "Tous" || question.subjects.includes(subject));
    return sort === "unanswered"
      ? [...filtered].sort((a, b) => a._count.answers - b._count.answers || Date.parse(b.createdAt) - Date.parse(a.createdAt))
      : filtered;
  }, [questions, subject, sort]);
  const pagination = usePagination(visible);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-bricolage text-2xl font-bold sm:text-3xl">Questions</h1>
          <p className="mt-1 text-muted-foreground">{questions.length} question(s) de la communauté</p>
        </div>
        <Button asChild><Link href="/questions/nouveau"><Plus className="h-4 w-4" /> Poser une question</Link></Button>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-2" role="group" aria-label="Filtrer par sujet">
        {subjects.map((item) => (
          <button key={item} aria-pressed={subject === item} onClick={() => { setSubject(item); pagination.setPage(1); }}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium ${subject === item ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:border-primary hover:text-primary"}`}>
            {item}
          </button>
        ))}
      </div>
      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Trier :</span>
        <button onClick={() => { setSort("recent"); pagination.setPage(1); }} className={sort === "recent" ? "rounded-lg bg-primary/10 px-3 py-1 font-medium text-primary" : "px-3 py-1 text-muted-foreground"}>Récentes</button>
        <button onClick={() => { setSort("unanswered"); pagination.setPage(1); }} className={sort === "unanswered" ? "rounded-lg bg-primary/10 px-3 py-1 font-medium text-primary" : "px-3 py-1 text-muted-foreground"}>Sans réponse</button>
      </div>

      {error && <p role="alert" className="mb-4 rounded-xl border border-accent/20 bg-accent/10 p-4 text-sm text-accent">{error}</p>}
      {loading ? (
        <div className="flex justify-center rounded-2xl border bg-card p-10"><LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : visible.length ? (
        <div className="flex flex-col gap-3">
          {pagination.pageItems.map((question) => (
            <article key={question.id} className="min-w-0 rounded-2xl border bg-card p-4 transition-colors hover:border-primary/40 sm:p-5">
              <Link href={`/questions/${question.id}`} className="break-words font-semibold leading-snug hover:text-primary">{question.title}</Link>
              <p className="mt-2 line-clamp-2 break-words whitespace-pre-wrap text-sm text-muted-foreground">{question.body}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {question.status === "SOLVED" && <Badge><CheckCircle2 className="h-3 w-3" /> Résolue</Badge>}
                {question.subjects.map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}
              </div>
              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" />
                {question._count.answers} réponse(s)
                <span className="ml-auto">{question.user.name} · {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(question.createdAt))}</span>
              </div>
            </article>
          ))}
          <PaginationControls
            page={pagination.page}
            pageSize={pagination.pageSize}
            totalItems={pagination.totalItems}
            totalPages={pagination.totalPages}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
          />
        </div>
      ) : (
        <div className="rounded-2xl border bg-card py-16 text-center">
          <MessageSquare className="mx-auto mb-4 h-9 w-9 text-primary/40" />
          <h2 className="font-bricolage text-xl font-bold">Aucune question ici pour le moment</h2>
          <p className="mt-2 text-sm text-muted-foreground">Pose la première question de la communauté.</p>
        </div>
      )}
    </div>
  );
}
