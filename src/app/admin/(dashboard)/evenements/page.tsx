"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import { CalendarDays, LoaderCircle, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type EventItem = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string | null;
  location: string;
  mode: "ONLINE" | "IN_PERSON";
  capacity: number | null;
  active: boolean;
  _count: { registrations: number };
};

const initialForm = {
  title: "",
  description: "",
  startsAt: "",
  endsAt: "",
  location: "",
  mode: "ONLINE" as EventItem["mode"],
  capacity: "",
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

export default function AdminEvenementsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await request("events");
      if (!Array.isArray(result)) throw new Error("Réponse des événements invalide.");
      setEvents(result as EventItem[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger les événements.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await request("events", "POST", {
        ...form,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
        capacity: form.capacity ? Number(form.capacity) : undefined,
      });
      setForm(initialForm);
      setNotice("L’événement a été créé.");
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Impossible de créer l’événement.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (item: EventItem) => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await request(`events/${item.id}`, "PATCH", { active: !item.active });
      setNotice("Le statut de l’événement a été mis à jour.");
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Impossible de modifier l’événement.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {error && <p role="alert" className="rounded-xl border border-accent/20 bg-accent/10 p-4 text-sm text-accent">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary">{notice}</p>}
      <form onSubmit={createEvent} className="grid gap-3 rounded-2xl border bg-card p-5 sm:grid-cols-2">
        <h2 className="font-bricolage text-lg font-bold sm:col-span-2">Créer un événement</h2>
        <Input required minLength={3} maxLength={180} placeholder="Titre" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Input required minLength={2} maxLength={250} placeholder="Lieu ou lien de rencontre" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">Début<Input required type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} /></label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">Fin (facultative)<Input type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} /></label>
        <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as EventItem["mode"] })} className="h-11 rounded-xl border border-input bg-background px-3 text-sm">
          <option value="ONLINE">En ligne</option><option value="IN_PERSON">En présentiel</option>
        </select>
        <Input type="number" min={1} placeholder="Capacité (facultative)" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
        <textarea required minLength={10} maxLength={5000} placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="rounded-xl border border-input bg-background px-4 py-3 text-sm sm:col-span-2" />
        <Button type="submit" disabled={saving} className="sm:col-span-2 sm:justify-self-start">
          {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}Créer l’événement
        </Button>
      </form>

      <div className="flex items-center justify-between">
        <h2 className="font-bricolage text-lg font-bold">Événements enregistrés</h2>
        <span className="text-sm text-muted-foreground">{events.length} événement(s)</span>
      </div>
      {loading ? (
        <div className="flex justify-center rounded-2xl border bg-card p-10"><LoaderCircle className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : events.length ? (
        <div className="flex flex-col gap-3">
          {events.map((item) => (
            <article key={item.id} className="flex flex-col gap-4 rounded-2xl border bg-card p-5 sm:flex-row sm:items-center">
              <CalendarDays className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.startsAt))}
                  {" · "}{item.mode === "ONLINE" ? "En ligne" : "Présentiel"}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{item.location} <Users className="ml-2 h-3 w-3" />{item._count.registrations}{item.capacity ? `/${item.capacity}` : ""}</p>
              </div>
              <Button variant={item.active ? "secondary" : "outline"} disabled={saving} onClick={() => void toggleActive(item)}>
                {item.active ? "Désactiver" : "Réactiver"}
              </Button>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-2xl border bg-card p-8 text-center text-sm text-muted-foreground">Aucun événement enregistré.</p>
      )}
    </div>
  );
}
