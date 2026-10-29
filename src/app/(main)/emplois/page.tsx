"use client";

import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, Clock, LoaderCircle, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { usePagination } from "@/hooks/use-pagination";

type JobOffer = {
  id: string;
  title: string;
  company: string;
  city: string;
  type: "EMPLOYMENT" | "INTERNSHIP" | "CONTRACT";
  level: string;
  description: string;
  applyUrl: string | null;
  createdAt: string;
};

const typeNames: Record<JobOffer["type"], string> = {
  EMPLOYMENT: "Emploi",
  INTERNSHIP: "Stage",
  CONTRACT: "Mission",
};

export default function EmploisPage() {
  const [jobs, setJobs] = useState<JobOffer[]>([]);
  const [typeFilter, setTypeFilter] = useState("Tous");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/community/jobs", { cache: "no-store" })
      .then(async (response) => {
        const result: unknown = await response.json().catch(() => null);
        if (!response.ok) throw new Error("Impossible de charger les offres.");
        if (!Array.isArray(result)) throw new Error("Réponse des offres invalide.");
        return result as JobOffer[];
      })
      .then((result) => {
        if (active) setJobs(result);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Impossible de charger les offres.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleJobs = useMemo(
    () => jobs.filter((job) => typeFilter === "Tous" || typeNames[job.type] === typeFilter),
    [jobs, typeFilter],
  );
  const pagination = usePagination(visibleJobs);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-7">
        <p className="mb-1 text-sm font-semibold text-primary">Opportunités</p>
        <h1 className="font-bricolage text-3xl font-bold">Emplois & missions</h1>
        <p className="mt-2 text-muted-foreground">{jobs.length} offre(s) publiée(s)</p>
      </header>
      <div className="mb-5 flex flex-wrap gap-2">
        {["Tous", "Emploi", "Stage", "Mission"].map((item) => (
          <button key={item} aria-pressed={typeFilter === item} onClick={() => { setTypeFilter(item); pagination.setPage(1); }}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${typeFilter === item ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:border-primary hover:text-primary"}`}>
            {item}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="mb-4 rounded-xl border border-accent/20 bg-accent/10 p-4 text-sm text-accent">{error}</p>}
      {loading ? (
        <div className="flex justify-center rounded-2xl border bg-card p-10"><LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : visibleJobs.length ? (
        <div className="flex flex-col gap-3">
          {pagination.pageItems.map((job) => (
            <article key={job.id} className="rounded-2xl border bg-card p-5">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><BriefcaseBusiness className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{job.title}</h2>
                    <Badge variant="outline">{typeNames[job.type]}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{job.company} · {job.level}</p>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.city}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(job.createdAt))}</span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{job.description}</p>
                  {job.applyUrl && (
                    <a href={job.applyUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-sm font-semibold text-primary underline">
                      Voir les modalités de candidature
                    </a>
                  )}
                  {!job.applyUrl && <p className="mt-3 text-xs text-muted-foreground">Les modalités de candidature sont à demander à l’entreprise.</p>}
                </div>
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
        <div className="rounded-2xl border bg-card p-10 text-center">
          <BriefcaseBusiness className="mx-auto mb-3 h-8 w-8 text-primary/40" />
          <p className="font-medium">Aucune offre publiée pour le moment.</p>
          <p className="mt-1 text-sm text-muted-foreground">Les offres validées apparaîtront ici.</p>
        </div>
      )}
    </div>
  );
}
