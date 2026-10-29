"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  LoaderCircle,
  MessageCircle,
  MessageSquare,
  Send,
  ShieldAlert,
  ThumbsUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { usePagination } from "@/hooks/use-pagination";

type AnswerComment = {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string };
};
type Answer = {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string };
  _count: { likes: number; comments: number };
  comments: AnswerComment[];
};
type Question = {
  id: string;
  title: string;
  body: string;
  subjects: string[];
  status: "OPEN" | "SOLVED";
  createdAt: string;
  user: { id: string; name: string };
  answers: Answer[];
};

function normalizeQuestion(value: unknown): Question | null {
  if (!value || typeof value !== "object") return null;
  const question = value as Record<string, unknown>;
  const questionUser =
    question.user && typeof question.user === "object"
      ? (question.user as Record<string, unknown>)
      : null;
  if (
    typeof question.id !== "string" ||
    typeof question.title !== "string" ||
    typeof question.body !== "string" ||
    typeof question.createdAt !== "string" ||
    (question.status !== "OPEN" && question.status !== "SOLVED") ||
    !Array.isArray(question.subjects) ||
    !question.subjects.every((subject) => typeof subject === "string") ||
    !questionUser ||
    typeof questionUser.id !== "string" ||
    typeof questionUser.name !== "string" ||
    !Array.isArray(question.answers)
  ) {
    return null;
  }

  const answers: Answer[] = [];
  for (const rawAnswer of question.answers) {
    if (!rawAnswer || typeof rawAnswer !== "object") continue;
    const answer = rawAnswer as Record<string, unknown>;
    const answerUser =
      answer.user && typeof answer.user === "object"
        ? (answer.user as Record<string, unknown>)
        : null;
    if (
      typeof answer.id !== "string" ||
      typeof answer.body !== "string" ||
      typeof answer.createdAt !== "string" ||
      !answerUser ||
      typeof answerUser.id !== "string" ||
      typeof answerUser.name !== "string"
    ) {
      continue;
    }

    const count =
      answer._count && typeof answer._count === "object"
        ? (answer._count as Record<string, unknown>)
        : {};
    const comments: AnswerComment[] = [];
    if (Array.isArray(answer.comments)) {
      for (const rawComment of answer.comments) {
        if (!rawComment || typeof rawComment !== "object") continue;
        const comment = rawComment as Record<string, unknown>;
        const commentUser =
          comment.user && typeof comment.user === "object"
            ? (comment.user as Record<string, unknown>)
            : null;
        if (
          typeof comment.id === "string" &&
          typeof comment.body === "string" &&
          typeof comment.createdAt === "string" &&
          commentUser &&
          typeof commentUser.id === "string" &&
          typeof commentUser.name === "string"
        ) {
          comments.push({
            id: comment.id,
            body: comment.body,
            createdAt: comment.createdAt,
            user: { id: commentUser.id, name: commentUser.name },
          });
        }
      }
    }

    answers.push({
      id: answer.id,
      body: answer.body,
      createdAt: answer.createdAt,
      user: { id: answerUser.id, name: answerUser.name },
      _count: {
        likes: typeof count.likes === "number" ? count.likes : 0,
        comments: typeof count.comments === "number" ? count.comments : 0,
      },
      comments,
    });
  }

  return {
    id: question.id,
    title: question.title,
    body: question.body,
    subjects: question.subjects,
    status: question.status,
    createdAt: question.createdAt,
    user: { id: questionUser.id, name: questionUser.name },
    answers,
  };
}

export default function QuestionPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [question, setQuestion] = useState<Question | null>(null);
  const [reply, setReply] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [likedAnswers, setLikedAnswers] = useState<Set<string>>(new Set());
  const [likingAnswerId, setLikingAnswerId] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>(
    {},
  );
  const [commentingAnswerId, setCommentingAnswerId] = useState<string | null>(
    null,
  );
  const answersPagination = usePagination(question?.answers ?? []);

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch(
        `/api/community/questions/${encodeURIComponent(id)}`,
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
            : "Question introuvable.";
        throw new Error(message);
      }
      const normalizedQuestion = normalizeQuestion(result);
      if (!normalizedQuestion) {
        throw new Error("La réponse de la question est invalide.");
      }
      setQuestion(normalizedQuestion);

      const authResponse = await fetch("/api/auth/me", {
        cache: "no-store",
      });
      if (authResponse.ok) {
        setIsAuthenticated(true);
        const likesResponse = await fetch(
          `/api/community/questions/${encodeURIComponent(id)}/answers/likes`,
          { cache: "no-store" },
        );
        if (likesResponse.ok) {
          const likedIds: unknown = await likesResponse
            .json()
            .catch(() => null);
          if (
            Array.isArray(likedIds) &&
            likedIds.every((value) => typeof value === "string")
          ) {
            setLikedAnswers(new Set(likedIds));
          }
        }
      } else if (authResponse.status === 401) {
        setIsAuthenticated(false);
        setLikedAnswers(new Set());
      } else {
        setIsAuthenticated(null);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger la question.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const submitAnswer = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/community/questions/${encodeURIComponent(id)}/answers`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: reply }),
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
            : "Impossible de publier la réponse.";
        throw new Error(message);
      }
      setReply("");
      setNotice("Ta réponse a été publiée.");
      await load();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Impossible de publier la réponse.",
      );
    } finally {
      setBusy(false);
    }
  };

  const setAnswerLiked = async (answerId: string) => {
    if (likingAnswerId) return;
    const liked = !likedAnswers.has(answerId);
    setLikingAnswerId(answerId);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/community/answers/${encodeURIComponent(answerId)}/like`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ liked }),
        },
      );
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          response.status === 401
            ? "Connecte-toi pour aimer une réponse."
            : result &&
                typeof result === "object" &&
                "message" in result &&
                typeof result.message === "string"
              ? result.message
              : "Impossible d’enregistrer ton J’aime.";
        throw new Error(message);
      }
      if (
        !result ||
        typeof result !== "object" ||
        !("liked" in result) ||
        typeof result.liked !== "boolean" ||
        !("count" in result) ||
        typeof result.count !== "number"
      ) {
        throw new Error("La réponse du serveur est invalide.");
      }
      const currentLikeStatus = result.liked;
      const likeCount = result.count;
      setLikedAnswers((current) => {
        const next = new Set(current);
        if (currentLikeStatus) next.add(answerId);
        else next.delete(answerId);
        return next;
      });
      setQuestion((current) =>
        current
          ? {
              ...current,
              answers: current.answers.map((answer) =>
                answer.id === answerId
                  ? {
                      ...answer,
                      _count: { ...answer._count, likes: likeCount },
                    }
                  : answer,
              ),
            }
          : current,
      );
    } catch (likeError) {
      setError(
        likeError instanceof Error
          ? likeError.message
          : "Impossible d’enregistrer ton J’aime.",
      );
    } finally {
      setLikingAnswerId(null);
    }
  };

  const submitComment = async (
    event: FormEvent<HTMLFormElement>,
    answerId: string,
  ) => {
    event.preventDefault();
    const body = commentDrafts[answerId]?.trim() ?? "";
    if (body.length < 2 || commentingAnswerId) return;
    setCommentingAnswerId(answerId);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/community/answers/${encodeURIComponent(answerId)}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        },
      );
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          response.status === 401
            ? "Connecte-toi pour commenter une réponse."
            : result &&
                typeof result === "object" &&
                "message" in result &&
                typeof result.message === "string"
              ? result.message
              : "Impossible de publier ton commentaire.";
        throw new Error(message);
      }
      const comment = result as AnswerComment;
      setQuestion((current) =>
        current
          ? {
              ...current,
              answers: current.answers.map((answer) =>
                answer.id === answerId
                  ? {
                      ...answer,
                      comments: [...answer.comments, comment],
                      _count: {
                        ...answer._count,
                        comments: answer._count.comments + 1,
                      },
                    }
                  : answer,
              ),
            }
          : current,
      );
      setCommentDrafts((current) => ({ ...current, [answerId]: "" }));
      setNotice("Ton commentaire a été publié.");
    } catch (commentError) {
      setError(
        commentError instanceof Error
          ? commentError.message
          : "Impossible de publier ton commentaire.",
      );
    } finally {
      setCommentingAnswerId(null);
    }
  };

  const submitReport = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/community/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: id, reason: reportReason }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          result &&
          typeof result === "object" &&
          "message" in result &&
          typeof result.message === "string"
            ? result.message
            : "Impossible d’envoyer le signalement.";
        throw new Error(message);
      }
      setReportOpen(false);
      setReportReason("");
      setNotice("Le signalement a été transmis à la modération.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Impossible d’envoyer le signalement.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link
        href="/questions"
        className="mb-7 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Retour aux questions
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
      ) : question ? (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            {question.status === "SOLVED" && <Badge>Résolue</Badge>}
            {question.subjects.map((subject) => (
              <Badge key={subject} variant="outline">
                {subject}
              </Badge>
            ))}
          </div>
          <h1 className="break-words font-bricolage text-2xl font-bold leading-tight sm:text-3xl">
            {question.title}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Posée par {question.user.name} ·{" "}
            {new Intl.DateTimeFormat("fr-FR", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(question.createdAt))}
          </p>
          <div className="my-6 break-words whitespace-pre-wrap rounded-2xl border bg-card p-4 leading-relaxed sm:p-5">
            {question.body}
          </div>

          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bricolage text-xl font-bold">
              {question.answers.length} réponse(s)
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReportOpen((open) => !open)}
            >
              <ShieldAlert className="h-4 w-4" /> Signaler
            </Button>
          </div>
          {reportOpen && (
            <form
              onSubmit={submitReport}
              className="mb-6 flex flex-col gap-3 rounded-xl border bg-card p-4"
            >
              <label className="text-sm font-medium" htmlFor="report-reason">
                Motif du signalement
              </label>
              <textarea
                id="report-reason"
                required
                minLength={3}
                maxLength={120}
                value={reportReason}
                onChange={(event) => setReportReason(event.target.value)}
                rows={2}
                className="rounded-xl border border-input bg-background px-3 py-2 text-sm"
              />
              <Button type="submit" size="sm" disabled={busy} className="w-fit">
                {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
                Envoyer le signalement
              </Button>
            </form>
          )}

          <div className="mb-8 flex flex-col gap-3">
            {answersPagination.pageItems.map((answer) => (
              <article
                key={answer.id}
                className="min-w-0 rounded-2xl border bg-card p-4 sm:p-5"
              >
                <p className="break-words whitespace-pre-wrap leading-relaxed">
                  {answer.body}
                </p>
                <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
                  {answer.user.name} ·{" "}
                  {new Intl.DateTimeFormat("fr-FR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(answer.createdAt))}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {isAuthenticated === false ? (
                    <Link
                      href="/connexion"
                      className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5"
                    >
                      <ThumbsUp className="h-4 w-4" />
                      Se connecter pour aimer · {answer._count.likes}
                    </Link>
                  ) : (
                    <Button
                      type="button"
                      variant={
                        likedAnswers.has(answer.id) ? "default" : "outline"
                      }
                      size="sm"
                      disabled={likingAnswerId !== null}
                      aria-pressed={likedAnswers.has(answer.id)}
                      onClick={() => void setAnswerLiked(answer.id)}
                    >
                      {likingAnswerId === answer.id ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <ThumbsUp className="h-4 w-4" />
                      )}
                      J’aime · {answer._count.likes}
                    </Button>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <MessageCircle className="h-4 w-4" />
                    {answer._count.comments} commentaire
                    {answer._count.comments !== 1 ? "s" : ""}
                  </span>
                </div>
                {answer._count.comments > answer.comments.length && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Les {answer.comments.length} commentaires les plus récents
                    sont affichés.
                  </p>
                )}
                {answer.comments.length > 0 && (
                  <div className="mt-4 space-y-3 border-l-2 border-primary/15 pl-4">
                    {[...answer.comments].reverse().map((comment) => (
                      <div key={comment.id} className="text-sm">
                        <p className="break-words whitespace-pre-wrap">{comment.body}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {comment.user.name} ·{" "}
                          {new Intl.DateTimeFormat("fr-FR", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(comment.createdAt))}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {isAuthenticated === false ? (
                  <p className="mt-4 text-sm text-muted-foreground">
                    <Link
                      href="/connexion"
                      className="font-medium text-primary hover:underline"
                    >
                      Connecte-toi
                    </Link>{" "}
                    pour commenter cette réponse.
                  </p>
                ) : (
                  <form
                    onSubmit={(event) => void submitComment(event, answer.id)}
                    className="mt-4 flex flex-col gap-2 sm:flex-row"
                  >
                    <textarea
                      aria-label={`Commenter la réponse de ${answer.user.name}`}
                      required
                      minLength={2}
                      maxLength={2000}
                      rows={2}
                      value={commentDrafts[answer.id] ?? ""}
                      onChange={(event) =>
                        setCommentDrafts((current) => ({
                          ...current,
                          [answer.id]: event.target.value,
                        }))
                      }
                      placeholder="Ajouter un commentaire…"
                      className="min-h-10 flex-1 resize-y rounded-xl border border-input bg-background px-3 py-2 text-sm"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      variant="outline"
                      disabled={
                        commentingAnswerId !== null ||
                        (commentDrafts[answer.id]?.trim().length ?? 0) < 2
                      }
                      className="sm:self-end"
                    >
                      {commentingAnswerId === answer.id ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Commenter
                    </Button>
                  </form>
                )}
              </article>
            ))}
            {!question.answers.length && (
              <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
                Pas encore de réponse. Tu peux être le premier.
              </p>
            )}
            <PaginationControls
              page={answersPagination.page}
              pageSize={answersPagination.pageSize}
              totalItems={answersPagination.totalItems}
              totalPages={answersPagination.totalPages}
              onPageChange={answersPagination.setPage}
              onPageSizeChange={answersPagination.setPageSize}
            />
          </div>

          {question.status === "OPEN" && isAuthenticated === false ? (
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-5">
              <p className="text-sm text-muted-foreground">
                Connecte-toi ou crée un compte pour répondre à cette question.
              </p>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href="/connexion">Se connecter</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/inscription">Créer un compte</Link>
                </Button>
              </div>
            </div>
          ) : question.status === "OPEN" ? (
            <form
              onSubmit={submitAnswer}
              className="rounded-2xl border bg-card p-5"
            >
              <h3 className="mb-3 font-semibold">Ta réponse</h3>
              <textarea
                required
                minLength={2}
                maxLength={5000}
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                rows={5}
                placeholder="Partage ta solution ou une précision…"
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm"
              />
              <Button
                type="submit"
                disabled={busy || reply.trim().length < 2}
                className="mt-3"
              >
                {busy ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Publier la réponse
              </Button>
            </form>
          ) : null}
        </>
      ) : (
        <div className="rounded-2xl border bg-card p-8 text-center">
          <MessageSquare className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
          Question indisponible.
        </div>
      )}
    </div>
  );
}
