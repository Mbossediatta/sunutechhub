"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

type Answer = {
  id: string;
  body: string;
  hidden: boolean;
  createdAt: string;
  user: { id: string; name: string };
};

async function responseError(response: Response, fallback: string) {
  const result: unknown = await response.json().catch(() => null);
  if (
    result &&
    typeof result === "object" &&
    "message" in result &&
    typeof result.message === "string"
  ) {
    return result.message;
  }
  return fallback;
}

export default function AdminQuestionsPage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answersByQuestion, setAnswersByQuestion] = useState<
    Record<string, Answer[]>
  >({});
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(
    null,
  );
  const [loadingAnswersId, setLoadingAnswersId] = useState("");
  const [deletingId, setDeletingId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const pagination = usePagination(questions);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/community/questions", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(
            await responseError(response, "Impossible de charger les questions."),
          );
        }
        const result: unknown = await response.json().catch(() => null);
        if (!Array.isArray(result)) {
          throw new Error("Réponse des questions invalide.");
        }
        return result as Question[];
      })
      .then((result) => {
        if (active) setQuestions(result);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Impossible de charger les questions.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const toggleAnswers = async (questionId: string) => {
    if (expandedQuestionId === questionId) {
      setExpandedQuestionId(null);
      return;
    }
    setExpandedQuestionId(questionId);
    if (answersByQuestion[questionId]) return;

    setLoadingAnswersId(questionId);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/community/questions/${encodeURIComponent(questionId)}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        throw new Error(
          await responseError(response, "Impossible de charger les réponses."),
        );
      }
      const result: unknown = await response.json().catch(() => null);
      if (
        !result ||
        typeof result !== "object" ||
        !("answers" in result) ||
        !Array.isArray(result.answers)
      ) {
        throw new Error("Réponse de la question invalide.");
      }
      setAnswersByQuestion((current) => ({
        ...current,
        [questionId]: result.answers as Answer[],
      }));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger les réponses.",
      );
      setExpandedQuestionId(null);
    } finally {
      setLoadingAnswersId("");
    }
  };

  const deleteQuestion = async (question: Question) => {
    if (
      !window.confirm(
        `Supprimer définitivement « ${question.title} » ? Toutes ses réponses, leurs commentaires et les signalements associés seront également supprimés.`,
      )
    ) {
      return;
    }

    setDeletingId(question.id);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/community/questions/${encodeURIComponent(question.id)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error(
          await responseError(response, "Impossible de supprimer la question."),
        );
      }
      setQuestions((current) =>
        current.filter((item) => item.id !== question.id),
      );
      setAnswersByQuestion((current) => {
        const next = { ...current };
        delete next[question.id];
        return next;
      });
      setExpandedQuestionId((current) =>
        current === question.id ? null : current,
      );
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Impossible de supprimer la question.",
      );
    } finally {
      setDeletingId("");
    }
  };

  const deleteAnswer = async (
    questionId: string,
    answer: Answer,
  ) => {
    if (
      !window.confirm(
        "Supprimer définitivement cette réponse ? Ses commentaires et signalements associés seront également supprimés.",
      )
    ) {
      return;
    }

    setDeletingId(answer.id);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/community/answers/${encodeURIComponent(answer.id)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error(
          await responseError(response, "Impossible de supprimer la réponse."),
        );
      }
      setAnswersByQuestion((current) => ({
        ...current,
        [questionId]: (current[questionId] ?? []).filter(
          (item) => item.id !== answer.id,
        ),
      }));
      if (!answer.hidden) {
        setQuestions((current) =>
          current.map((question) =>
            question.id === questionId
              ? {
                  ...question,
                  _count: {
                    answers: Math.max(0, question._count.answers - 1),
                  },
                }
              : question,
          ),
        );
      }
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Impossible de supprimer la réponse.",
      );
    } finally {
      setDeletingId("");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-accent/20 bg-accent/10 p-4 text-sm text-accent"
        >
          {error}
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          ["Toutes", questions.length],
          [
            "Ouvertes",
            questions.filter((question) => question.status === "OPEN").length,
          ],
          [
            "Masquées",
            questions.filter((question) => question.status === "HIDDEN").length,
          ],
        ].map(([label, count]) => (
          <div
            key={label}
            className="rounded-2xl border bg-card p-4 text-center"
          >
            <p className="font-bricolage text-2xl font-extrabold text-primary">
              {loading ? "…" : count}
            </p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="p-3">Question</th>
              <th className="p-3">Auteur</th>
              <th className="p-3">Réponses</th>
              <th className="p-3">État</th>
              <th className="p-3">Date</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  className="p-8 text-center text-muted-foreground"
                >
                  <LoaderCircle className="mx-auto h-5 w-5 animate-spin" />
                  <span className="mt-2 block">Chargement…</span>
                </td>
              </tr>
            ) : questions.length ? (
              pagination.pageItems.map((question) => (
                <Fragment key={question.id}>
                  <tr className="border-t">
                    <td className="max-w-md p-3">
                      <Link
                        href={`/questions/${question.id}`}
                        className="flex items-start gap-2 font-medium hover:text-primary"
                      >
                        <MessageSquare className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>
                          {question.title}
                          <span className="mt-1 block line-clamp-2 text-xs font-normal text-muted-foreground">
                            {question.body}
                          </span>
                          <span className="mt-1 flex flex-wrap gap-1">
                            {question.subjects.map((subject) => (
                              <Badge
                                key={subject}
                                variant="outline"
                                className="text-[10px]"
                              >
                                {subject}
                              </Badge>
                            ))}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="whitespace-nowrap p-3 text-xs">
                      {question.user.name}
                    </td>
                    <td className="p-3">{question._count.answers}</td>
                    <td className="p-3">
                      <Badge
                        variant={
                          question.status === "HIDDEN" ? "accent" : "secondary"
                        }
                      >
                        {question.status === "OPEN"
                          ? "Ouverte"
                          : question.status === "SOLVED"
                            ? "Résolue"
                            : "Masquée"}
                      </Badge>
                    </td>
                    <td className="whitespace-nowrap p-3 text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat("fr-FR", {
                        dateStyle: "medium",
                      }).format(new Date(question.createdAt))}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void toggleAnswers(question.id)}
                          disabled={loadingAnswersId === question.id}
                        >
                          {loadingAnswersId === question.id ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : expandedQuestionId === question.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                          Réponses
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => void deleteQuestion(question)}
                          disabled={deletingId === question.id}
                        >
                          {deletingId === question.id ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Supprimer
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {expandedQuestionId === question.id && (
                    <tr className="border-t bg-muted/20">
                      <td colSpan={6} className="p-4">
                        {loadingAnswersId === question.id ? (
                          <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            Chargement des réponses…
                          </div>
                        ) : answersByQuestion[question.id]?.length ? (
                          <ul className="flex flex-col gap-3">
                            {answersByQuestion[question.id].map((answer) => (
                              <li
                                key={answer.id}
                                className="flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-start sm:justify-between"
                              >
                                <div className="min-w-0">
                                  <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <span>{answer.user.name}</span>
                                    <span>
                                      {new Intl.DateTimeFormat("fr-FR", {
                                        dateStyle: "medium",
                                      }).format(new Date(answer.createdAt))}
                                    </span>
                                    {answer.hidden && (
                                      <Badge variant="accent">Masquée</Badge>
                                    )}
                                  </div>
                                  <p className="whitespace-pre-wrap text-sm">
                                    {answer.body}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() =>
                                    void deleteAnswer(question.id, answer)
                                  }
                                  disabled={deletingId === answer.id}
                                >
                                  {deletingId === answer.id ? (
                                    <LoaderCircle className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                  Supprimer la réponse
                                </Button>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="py-3 text-center text-sm text-muted-foreground">
                            Aucune réponse à cette question.
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))
            ) : (
              <tr>
                <td
                  colSpan={6}
                  className="p-8 text-center text-sm text-muted-foreground"
                >
                  Aucune question enregistrée.
                </td>
              </tr>
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
      <p className="text-xs text-muted-foreground">
        Le masquage du contenu signalé se traite depuis la page Modération.
      </p>
    </div>
  );
}
