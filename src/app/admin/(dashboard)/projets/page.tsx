"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CircleAlert, CircleCheck, ExternalLink, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { usePagination } from "@/hooks/use-pagination";

type Project = {
  id: string;
  title: string;
  description: string;
  link: string | null;
  status: "PENDING" | "APPROVED" | "NEEDS_IMPROVEMENT";
  reviewNote: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  user: { name: string; email: string };
  course: { title: string };
};

const labels = {
  PENDING: "En attente d’évaluation",
  APPROVED: "Validé",
  NEEDS_IMPROVEMENT: "Améliorations demandées",
};

async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/admin/${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      result &&
      typeof result === "object" &&
      "message" in result &&
      typeof result.message === "string"
        ? result.message
        : "La requête n’a pas abouti.";
    throw new Error(message);
  }
  return result as T;
}

export default function AdminProjetsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setProjects(await adminRequest<Project[]>("projects"));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Chargement impossible.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () => projects.filter((project) => status === "ALL" || project.status === status),
    [projects, status],
  );
  const pagination = usePagination(filtered);

  const review = async (project: Project, nextStatus: Project["status"]) => {
    const reviewNote =
      nextStatus === "NEEDS_IMPROVEMENT"
        ? window.prompt("Indique les améliorations attendues :")?.trim()
        : undefined;
    if (nextStatus === "NEEDS_IMPROVEMENT" && !reviewNote) return;

    setUpdating(project.id);
    setError("");
    setNotice("");
    try {
      await adminRequest(`projects/${encodeURIComponent(project.id)}/review`, {
        method: "POST",
        body: JSON.stringify({ status: nextStatus, reviewNote }),
      });
      setNotice(`Le projet « ${project.title} » a été mis à jour.`);
      await load();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "Évaluation impossible.");
    } finally {
      setUpdating("");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <p role="alert" className="rounded-xl border border-accent/20 bg-accent/10 p-4 text-sm text-accent">
          ! {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary">
          ✓ {notice}
        </p>
      )}
      <label className="flex flex-col gap-1.5 text-sm sm:max-w-xs">
        <span className="font-semibold">Filtrer les projets</span>
        <select
          value={status}
          onChange={(event) => { setStatus(event.target.value); pagination.setPage(1); }}
          className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
        >
          <option value="PENDING">En attente d’évaluation</option>
          <option value="APPROVED">Validés</option>
          <option value="NEEDS_IMPROVEMENT">Améliorations demandées</option>
          <option value="ALL">Tous les projets</option>
        </select>
      </label>
      {loading ? (
        <div className="flex items-center justify-center gap-2 p-10 text-sm text-muted-foreground">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Chargement des projets…
        </div>
      ) : filtered.length ? (
        <div className="grid gap-4">
          {pagination.pageItems.map((project) => {
            const waitingDays = Math.floor(
              (Date.now() - new Date(project.submittedAt).getTime()) / 86_400_000,
            );
            return (
              <article key={project.id} className="rounded-2xl border bg-card p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{project.course.title}</p>
                    <h2 className="mt-1 font-bricolage text-lg font-bold">{project.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {project.user.name} · {project.user.email}
                    </p>
                  </div>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {labels[project.status]}
                  </span>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-sm leading-6">{project.description}</p>
                {project.link && (
                  <a
                    href={project.link}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1 text-sm text-primary underline"
                  >
                    Ouvrir le projet <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                {project.reviewNote && (
                  <p className="mt-3 rounded-xl bg-accent/10 p-3 text-sm text-accent">
                    Commentaire : {project.reviewNote}
                  </p>
                )}
                <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                  {waitingDays > 5 && project.status === "PENDING" ? (
                    <CircleAlert className="h-3.5 w-3.5 text-accent" />
                  ) : null}
                  Envoyé le{" "}
                  {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(
                    new Date(project.submittedAt),
                  )}
                  {project.status === "PENDING" && ` · attente depuis ${waitingDays} j`}
                </p>
                {project.status === "PENDING" && (
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Button
                      disabled={updating === project.id}
                      onClick={() => review(project, "APPROVED")}
                      className="gap-2"
                    >
                      {updating === project.id ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <CircleCheck className="h-4 w-4" />
                      )}
                      Valider
                    </Button>
                    <Button
                      disabled={updating === project.id}
                      variant="outline"
                      onClick={() => review(project, "NEEDS_IMPROVEMENT")}
                    >
                      Demander des améliorations
                    </Button>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">
          Aucun projet dans cette catégorie.
        </p>
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
