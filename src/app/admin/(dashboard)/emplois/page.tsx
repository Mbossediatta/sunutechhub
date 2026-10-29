"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { BriefcaseBusiness, LoaderCircle, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  status: "PENDING" | "PUBLISHED" | "REJECTED" | "CLOSED";
  createdAt: string;
};

const initialForm = {
  title: "",
  company: "",
  city: "",
  type: "EMPLOYMENT" as JobOffer["type"],
  level: "",
  description: "",
  applyUrl: "",
};

const statusNames: Record<JobOffer["status"], string> = {
  PENDING: "En attente",
  PUBLISHED: "Publiée",
  REJECTED: "Refusée",
  CLOSED: "Clôturée",
};

async function request(path: string, method = "GET", data?: unknown) {
  const response = await fetch(`/api/admin/${path}`, {
    method,
    headers: data ? { "Content-Type": "application/json" } : undefined,
    body: data ? JSON.stringify(data) : undefined,
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
  return result;
}

export default function AdminEmploisPage() {
  const [jobs, setJobs] = useState<JobOffer[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pagination = usePagination(jobs);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await request("jobs");
      if (!Array.isArray(result)) throw new Error("Réponse des offres invalide.");
      setJobs(result as JobOffer[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger les offres.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await request("jobs", "POST", { ...form, applyUrl: form.applyUrl || undefined });
      setForm(initialForm);
      setNotice("L’offre a été enregistrée comme en attente de publication.");
      await load();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Impossible de créer l’offre.");
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (job: JobOffer, status: JobOffer["status"]) => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await request(`jobs/${job.id}/review`, "PATCH", { status });
      setNotice("Le statut de l’offre a été mis à jour.");
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Impossible de modifier l’offre.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {error && <p role="alert" className="rounded-xl border border-accent/20 bg-accent/10 p-4 text-sm text-accent">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary">{notice}</p>}
      <form onSubmit={create} className="grid gap-3 rounded-2xl border bg-card p-5 sm:grid-cols-2">
        <h2 className="font-bricolage text-lg font-bold sm:col-span-2">Ajouter une offre</h2>
        <Input required minLength={3} maxLength={180} placeholder="Intitulé du poste" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Input required minLength={2} maxLength={180} placeholder="Entreprise" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        <Input required minLength={2} maxLength={120} placeholder="Ville" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        <Input required minLength={2} maxLength={100} placeholder="Niveau" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as JobOffer["type"] })} className="h-11 rounded-xl border border-input bg-background px-3 text-sm">
          <option value="EMPLOYMENT">Emploi</option><option value="INTERNSHIP">Stage</option><option value="CONTRACT">Mission / contrat</option>
        </select>
        <Input type="url" maxLength={2048} placeholder="Lien de candidature (facultatif)" value={form.applyUrl} onChange={(e) => setForm({ ...form, applyUrl: e.target.value })} />
        <textarea required minLength={20} maxLength={8000} placeholder="Description de l’offre" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="rounded-xl border border-input bg-background px-4 py-3 text-sm sm:col-span-2" />
        <Button type="submit" disabled={saving} className="sm:col-span-2 sm:justify-self-start">
          {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}Enregistrer l’offre
        </Button>
      </form>

      <div className="flex items-center justify-between">
        <h2 className="font-bricolage text-lg font-bold">Offres enregistrées</h2>
        <span className="text-sm text-muted-foreground">{jobs.length} offre(s)</span>
      </div>
      {loading ? (
        <div className="flex justify-center rounded-2xl border bg-card p-10"><LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : jobs.length ? (
        <div className="flex flex-col gap-3">
          {pagination.pageItems.map((job) => (
            <article key={job.id} className="flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-start">
              <BriefcaseBusiness className="mt-1 h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{job.title}</h3>
                  <Badge variant={job.status === "PENDING" ? "accent" : "secondary"}>{statusNames[job.status]}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{job.company} · {job.type === "EMPLOYMENT" ? "Emploi" : job.type === "INTERNSHIP" ? "Stage" : "Mission"} · {job.level}</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{job.city}</p>
                <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{job.description}</p>
                {job.applyUrl && <a className="mt-2 inline-block text-sm text-primary underline" href={job.applyUrl} target="_blank" rel="noreferrer">Lien de candidature</a>}
              </div>
              <div className="flex flex-wrap gap-2">
                {job.status !== "PUBLISHED" && <Button size="sm" disabled={saving} onClick={() => void updateStatus(job, "PUBLISHED")}>Publier</Button>}
                {job.status !== "REJECTED" && <Button size="sm" variant="outline" disabled={saving} onClick={() => void updateStatus(job, "REJECTED")}>Refuser</Button>}
                {job.status === "PUBLISHED" && <Button size="sm" variant="secondary" disabled={saving} onClick={() => void updateStatus(job, "CLOSED")}>Clôturer</Button>}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">Aucune offre n’est enregistrée.</p>
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
