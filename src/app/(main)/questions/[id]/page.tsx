"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, LoaderCircle, MessageSquare, Send, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Answer = {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; name: string };
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

export default function QuestionPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [question, setQuestion] = useState<Question | null>(null);
  const [reply, setReply] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch(`/api/community/questions/${encodeURIComponent(id)}`, { cache: "no-store" });
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
      setQuestion(result as Question);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger la question.");
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
      const response = await fetch(`/api/community/questions/${encodeURIComponent(id)}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: reply }),
      });
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
      setError(submitError instanceof Error ? submitError.message : "Impossible de publier la réponse.");
    } finally {
      setBusy(false);
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
      setError(submitError instanceof Error ? submitError.message : "Impossible d’envoyer le signalement.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link href="/questions" className="mb-7 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Retour aux questions
      </Link>
      {error && <p role="alert" className="mb-4 rounded-xl border border-accent/20 bg-accent/10 p-4 text-sm text-accent">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary">{notice}</p>}
      {loading ? (
        <div className="flex justify-center rounded-2xl border bg-card p-10"><LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : question ? (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            {question.status === "SOLVED" && <Badge>Résolue</Badge>}
            {question.subjects.map((subject) => <Badge key={subject} variant="outline">{subject}</Badge>)}
          </div>
          <h1 className="font-bricolage text-2xl font-bold leading-tight sm:text-3xl">{question.title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Posée par {question.user.name} · {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(question.createdAt))}
          </p>
          <div className="my-6 whitespace-pre-wrap rounded-2xl border bg-card p-5 leading-relaxed">{question.body}</div>

          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bricolage text-xl font-bold">{question.answers.length} réponse(s)</h2>
            <Button variant="outline" size="sm" onClick={() => setReportOpen((open) => !open)}>
              <ShieldAlert className="h-4 w-4" /> Signaler
            </Button>
          </div>
          {reportOpen && (
            <form onSubmit={submitReport} className="mb-6 flex flex-col gap-3 rounded-xl border bg-card p-4">
              <label className="text-sm font-medium" htmlFor="report-reason">Motif du signalement</label>
              <textarea id="report-reason" required minLength={3} maxLength={120} value={reportReason} onChange={(event) => setReportReason(event.target.value)} rows={2} className="rounded-xl border border-input bg-background px-3 py-2 text-sm" />
              <Button type="submit" size="sm" disabled={busy} className="w-fit">{busy && <LoaderCircle className="h-4 w-4 animate-spin" />}Envoyer le signalement</Button>
            </form>
          )}

          <div className="mb-8 flex flex-col gap-3">
            {question.answers.map((answer) => (
              <article key={answer.id} className="rounded-2xl border bg-card p-5">
                <p className="whitespace-pre-wrap leading-relaxed">{answer.body}</p>
                <p className="mt-4 border-t pt-3 text-xs text-muted-foreground">
                  {answer.user.name} · {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(answer.createdAt))}
                </p>
              </article>
            ))}
            {!question.answers.length && <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">Pas encore de réponse. Tu peux être le premier.</p>}
          </div>

          {question.status === "OPEN" && (
            <form onSubmit={submitAnswer} className="rounded-2xl border bg-card p-5">
              <h3 className="mb-3 font-semibold">Ta réponse</h3>
              <textarea required minLength={2} maxLength={5000} value={reply} onChange={(event) => setReply(event.target.value)} rows={5} placeholder="Partage ta solution ou une précision…" className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm" />
              <Button type="submit" disabled={busy || reply.trim().length < 2} className="mt-3">
                {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Publier la réponse
              </Button>
            </form>
          )}
        </>
      ) : (
        <div className="rounded-2xl border bg-card p-8 text-center"><MessageSquare className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />Question indisponible.</div>
      )}
    </div>
  );
}
