"use client";

import { useEffect, useState } from "react";
import { CalendarDays, LoaderCircle, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { usePagination } from "@/hooks/use-pagination";

type EventItem = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  location: string;
  mode: "ONLINE" | "IN_PERSON";
  capacity: number | null;
  _count: { registrations: number };
};

export default function EvenementsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pagination = usePagination(events);

  useEffect(() => {
    let active = true;
    fetch("/api/community/events", { cache: "no-store" })
      .then(async (response) => {
        const result: unknown = await response.json().catch(() => null);
        if (!response.ok) throw new Error("Impossible de charger les événements.");
        if (!Array.isArray(result)) throw new Error("Réponse des événements invalide.");
        return result as EventItem[];
      })
      .then((result) => {
        if (active) setEvents(result);
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Impossible de charger les événements.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const register = async (item: EventItem) => {
    setRegistering(item.id);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/community/events/${encodeURIComponent(item.id)}/register`, { method: "POST" });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          result &&
          typeof result === "object" &&
          "message" in result &&
          typeof result.message === "string"
            ? result.message
            : "Impossible de s’inscrire à cet événement.";
        throw new Error(message);
      }
      setNotice("Ton inscription à l’événement est enregistrée.");
      const reload = await fetch("/api/community/events", { cache: "no-store" });
      const updated: unknown = await reload.json().catch(() => null);
      if (!reload.ok || !Array.isArray(updated)) throw new Error("Inscription faite, mais le nombre de places n’a pas pu être actualisé.");
      setEvents(updated as EventItem[]);
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : "Impossible de s’inscrire.");
    } finally {
      setRegistering("");
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-8">
        <p className="mb-1 text-sm font-semibold text-primary">Agenda</p>
        <h1 className="font-bricolage text-3xl font-bold">Événements</h1>
        <p className="mt-2 text-muted-foreground">Rencontres à venir, en ligne et en présentiel.</p>
      </header>
      {error && <p role="alert" className="mb-4 rounded-xl border border-accent/20 bg-accent/10 p-4 text-sm text-accent">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary">{notice}</p>}
      {loading ? (
        <div className="flex justify-center rounded-2xl border bg-card p-10"><LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : events.length ? (
        <div className="flex flex-col gap-3">
          {pagination.pageItems.map((item) => {
            const full = item.capacity !== null && item._count.registrations >= item.capacity;
            return (
              <article key={item.id} className="flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row">
                <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CalendarDays className="h-5 w-5" />
                  <span className="text-[10px] font-semibold">{new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(new Date(item.startsAt))}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{item.title}</h2>
                    <Badge variant={item.mode === "ONLINE" ? "default" : "secondary"}>{item.mode === "ONLINE" ? "En ligne" : "Présentiel"}</Badge>
                  </div>
                  <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{item.location}</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{item.description}</p>
                  <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />{item._count.registrations} inscrit(s){item.capacity ? ` sur ${item.capacity}` : ""}
                    {" · "}{new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.startsAt))}
                  </p>
                  <Button size="sm" className="mt-3" disabled={full || registering === item.id} onClick={() => void register(item)}>
                    {registering === item.id && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    {full ? "Complet" : "S’inscrire"}
                  </Button>
                </div>
              </article>
            );
          })}
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
          <CalendarDays className="mx-auto mb-3 h-8 w-8 text-primary/40" />
          <p className="font-medium">Aucun événement à venir.</p>
          <p className="mt-1 text-sm text-muted-foreground">Les prochains événements seront publiés ici.</p>
        </div>
      )}
      {!loading && events.length === 0 && !error && (
        <p className="mt-5 text-center text-xs text-muted-foreground">
          {`Vous organisez un événement ? Contactez l’équipe Sunu Tech Hub.`}
        </p>
      )}
    </div>
  );
}
