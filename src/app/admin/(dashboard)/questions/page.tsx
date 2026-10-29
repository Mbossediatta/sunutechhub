"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LoaderCircle, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { usePagination } from "@/hooks/use-pagination";

type Question = {
  id: string;
  title: string;
  body: string;
  subjects: string[];
  status: "OPEN" | "SOLVED" | "HIDDEN";
  createdAt: string;
  user: { id: string; name: string };
  _count: { answers: number };
};

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const pagination = usePagination(questions);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/community/questions", { cache: "no-store" })
      .then(async (response) => {
        const result: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            result &&
            typeof result === "object" &&
            "message" in result &&
            typeof result.message === "string"
              ? result.message
              : "Impossible de charger les questions.";
          throw new Error(message);
        }
        if (!Array.isArray(result)) throw new Error("Réponse des questions invalide.");
        return result as Question[];
      })
      .then((result) => {
        if (active) setQuestions(result);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Impossible de charger les questions.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {error && <p role="alert" className="rounded-xl border border-accent/20 bg-accent/10 p-4 text-sm text-accent">{error}</p>}
      <div className="grid grid-cols-3 gap-3">
        {[
          ["Toutes", questions.length],
          ["Ouvertes", questions.filter((question) => question.status === "OPEN").length],
          ["Masquées", questions.filter((question) => question.status === "HIDDEN").length],
        ].map(([label, count]) => (
          <div key={label} className="rounded-2xl border bg-card p-4 text-center">
            <p className="font-bricolage text-2xl font-extrabold text-primary">{loading ? "…" : count}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="p-3">Question</th>
              <th className="p-3">Auteur</th>
              <th className="p-3">Réponses</th>
              <th className="p-3">État</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground"><LoaderCircle className="mx-auto h-5 w-5 animate-spin" /><span className="mt-2 block">Chargement…</span></td></tr>
            ) : questions.length ? (
              pagination.pageItems.map((question) => (
                <tr key={question.id} className="border-t">
                  <td className="max-w-md p-3">
                    <Link href={`/questions/${question.id}`} className="flex items-start gap-2 font-medium hover:text-primary">
                      <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>
                        {question.title}
                        <span className="mt-1 block line-clamp-2 text-xs font-normal text-muted-foreground">{question.body}</span>
                        <span className="mt-1 flex flex-wrap gap-1">
                          {question.subjects.map((subject) => <Badge key={subject} variant="outline" className="text-[10px]">{subject}</Badge>)}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="whitespace-nowrap p-3 text-xs">{question.user.name}</td>
                  <td className="p-3">{question._count.answers}</td>
                  <td className="p-3"><Badge variant={question.status === "HIDDEN" ? "accent" : "secondary"}>{question.status === "OPEN" ? "Ouverte" : question.status === "SOLVED" ? "Résolue" : "Masquée"}</Badge></td>
                  <td className="whitespace-nowrap p-3 text-xs text-muted-foreground">{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(question.createdAt))}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">Aucune question enregistrée.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <PaginationControls
        page={pagination.page}
        pageSize={pagination.pageSize}
        totalItems={pagination.totalItems}
        totalPages={pagination.totalPages}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setPageSize}
      />
      <p className="text-xs text-muted-foreground">Le masquage du contenu signalé se traite depuis la page Modération.</p>
    </div>
  );
}
