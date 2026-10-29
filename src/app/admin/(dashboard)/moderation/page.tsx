"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, EyeOff, LoaderCircle, ShieldAlert, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { usePagination } from "@/hooks/use-pagination";

type Report = {
  id: string;
  reason: string;
  details: string | null;
  status: "PENDING" | "REVIEWED" | "DISMISSED";
  createdAt: string;
  reporter: { name: string; email: string };
  question: { id: string; title: string; body: string; status: string } | null;
  answer: {
    id: string;
    body: string;
    hidden: boolean;
    question: { id: string; title: string };
  } | null;
};

async function review(reportId: string, status: "REVIEWED" | "DISMISSED", hideTarget: boolean) {
  const response = await fetch(`/api/admin/community/reports/${reportId}/review`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, hideTarget }),
  });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      result &&
      typeof result === "object" &&
      "message" in result &&
      typeof result.message === "string"
        ? result.message
        : "Impossible de traiter le signalement.";
    throw new Error(message);
  }
}

export default function AdminModerationPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [tab, setTab] = useState<"PENDING" | "CLOSED">("PENDING");
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/community/reports", { cache: "no-store" });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          result &&
          typeof result === "object" &&
          "message" in result &&
          typeof result.message === "string"
            ? result.message
            : "Impossible de charger les signalements.";
        throw new Error(message);
      }
      if (!Array.isArray(result)) throw new Error("Réponse des signalements invalide.");
      setReports(result as Report[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger les signalements.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pendingCount = reports.filter((report) => report.status === "PENDING").length;
  const closedCount = reports.length - pendingCount;
  const visibleReports = useMemo(
    () =>
      reports.filter((report) =>
        tab === "PENDING" ? report.status === "PENDING" : report.status !== "PENDING",
      ),
    [reports, tab],
  );
  const pagination = usePagination(visibleReports);

  const handleReview = async (
    report: Report,
    status: "REVIEWED" | "DISMISSED",
    hideTarget: boolean,
  ) => {
    setActingId(report.id);
    setError("");
    try {
      await review(report.id, status, hideTarget);
      await load();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Impossible de traiter le signalement.");
    } finally {
      setActingId("");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {error && <p role="alert" className="rounded-xl border border-accent/20 bg-accent/10 p-4 text-sm text-accent">{error}</p>}
      <div className="grid grid-cols-3 gap-3">
        {[
          ["En attente", pendingCount],
          ["Traités", closedCount],
          ["Total", reports.length],
        ].map(([label, count]) => (
          <div key={label} className="rounded-2xl border bg-card p-4 text-center">
            <p className="font-bricolage text-2xl font-extrabold text-primary">{loading ? "…" : count}</p>
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant={tab === "PENDING" ? "default" : "secondary"} onClick={() => { setTab("PENDING"); pagination.setPage(1); }}>
          En attente ({pendingCount})
        </Button>
        <Button variant={tab === "CLOSED" ? "default" : "secondary"} onClick={() => { setTab("CLOSED"); pagination.setPage(1); }}>
          Traités ({closedCount})
        </Button>
      </div>
      {loading ? (
        <div className="flex justify-center rounded-2xl border bg-card p-10 text-muted-foreground"><LoaderCircle className="h-5 w-5 animate-spin" /></div>
      ) : visibleReports.length ? (
        <div className="flex flex-col gap-3">
          {pagination.pageItems.map((report) => {
            const target = report.question
              ? { label: "Question", title: report.question.title, body: report.question.body }
              : report.answer
                ? { label: "Réponse", title: report.answer.question.title, body: report.answer.body }
                : { label: "Contenu supprimé", title: "Cible indisponible", body: "" };
            return (
              <article key={report.id} className="rounded-2xl border bg-card p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{target.label}</Badge>
                  <Badge variant={report.status === "PENDING" ? "accent" : "secondary"}>
                    {report.status === "PENDING" ? "En attente" : report.status === "REVIEWED" ? "Examiné" : "Écarté"}
                  </Badge>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(report.createdAt))}
                  </span>
                </div>
                <h2 className="mt-3 font-semibold">{target.title}</h2>
                {target.body && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{target.body}</p>}
                <p className="mt-3 text-sm"><span className="font-medium">Motif :</span> {report.reason}</p>
                {report.details && <p className="mt-1 text-sm text-muted-foreground">{report.details}</p>}
                <p className="mt-2 text-xs text-muted-foreground">Signalé par {report.reporter.name} · {report.reporter.email}</p>
                {report.status === "PENDING" && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => void handleReview(report, "REVIEWED", true)} disabled={actingId === report.id}>
                      {actingId === report.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />}
                      Masquer et traiter
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => void handleReview(report, "REVIEWED", false)} disabled={actingId === report.id}>
                      <CheckCircle2 className="h-4 w-4" /> Traiter sans masquer
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => void handleReview(report, "DISMISSED", false)} disabled={actingId === report.id}>
                      <XCircle className="h-4 w-4" /> Écarter
                    </Button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border bg-card p-10 text-center">
          <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-primary/50" />
          <p className="font-medium">{tab === "PENDING" ? "Aucun signalement en attente." : "Aucun signalement traité."}</p>
        </div>
      )}
      {!loading && (
        <PaginationControls
          page={pagination.page}
          pageSize={pagination.pageSize}
          totalItems={pagination.totalItems}
          totalPages={pagination.totalPages}
          onPageChange={pagination.setPage}
          onPageSizeChange={pagination.setPageSize}
        />
      )}
    </div>
  );
}
