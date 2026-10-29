"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LoaderCircle, Search, Users } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { usePagination } from "@/hooks/use-pagination";

type Member = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MEMBER";
  createdAt: string;
  registrations: { id: string; course: { id: string; title: string } }[];
  _count: { registrations: number; payments: number; projects: number };
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AdminMembresPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          result &&
          typeof result === "object" &&
          "message" in result &&
          typeof result.message === "string"
            ? result.message
            : "Impossible de charger les comptes.";
        throw new Error(message);
      }
      if (!Array.isArray(result)) throw new Error("Réponse de comptes invalide.");
      setMembers(result as Member[]);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger les comptes.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(
    () =>
      members.filter((member) => {
        const matchesRole = role === "ALL" || member.role === role;
        const text = `${member.name} ${member.email}`.toLowerCase();
        return matchesRole && text.includes(search.toLowerCase());
      }),
    [members, role, search],
  );
  const pagination = usePagination(filtered);
  const memberCount = members.filter((member) => member.role === "MEMBER").length;
  const adminCount = members.filter((member) => member.role === "ADMIN").length;

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <p role="alert" className="rounded-xl border border-accent/20 bg-accent/10 p-4 text-sm text-accent">
          ! {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: "Comptes affichés", value: loading ? "…" : members.length },
          { label: "Membres", value: loading ? "…" : memberCount },
          { label: "Administrateurs", value: loading ? "…" : adminCount },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border bg-card p-4 text-center">
            <p className="font-bricolage text-2xl font-extrabold text-primary">
              {item.value}
            </p>
            <p className="text-xs text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou e-mail"
            value={search}
            onChange={(event) => { setSearch(event.target.value); pagination.setPage(1); }}
            className="rounded-xl pl-9"
          />
        </div>
        <select
          value={role}
          onChange={(event) => { setRole(event.target.value); pagination.setPage(1); }}
          className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
        >
          <option value="ALL">Tous les rôles</option>
          <option value="MEMBER">Membres</option>
          <option value="ADMIN">Administrateurs</option>
        </select>
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="p-3">Compte</th>
              <th className="p-3">Rôle</th>
              <th className="p-3">Cours suivis</th>
              <th className="p-3">Paiements</th>
              <th className="p-3">Projets</th>
              <th className="p-3">Inscription</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  <LoaderCircle className="mx-auto h-5 w-5 animate-spin" />
                  <span className="mt-2 block">Chargement des membres…</span>
                </td>
              </tr>
            ) : filtered.length ? (
              pagination.pageItems.map((member) => (
                <tr key={member.id} className="border-t">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                        {initials(member.name)}
                      </span>
                      <span>
                        <Link href={`/profil/${member.id}`} className="block font-medium hover:text-primary">{member.name}</Link>
                        <span className="block text-xs text-muted-foreground">{member.email}</span>
                      </span>
                    </div>
                  </td>
                  <td className="p-3">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      {member.role === "ADMIN" ? "Administration" : "Membre"}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="font-medium">{member._count.registrations}</span>
                    {member.registrations.length > 0 && (
                      <ul className="mt-1 max-w-xs space-y-1 text-xs text-muted-foreground">
                        {member.registrations.map(({ id, course }) => <li key={id}>{course.title}</li>)}
                      </ul>
                    )}
                  </td>
                  <td className="p-3">{member._count.payments}</td>
                  <td className="p-3">{member._count.projects}</td>
                  <td className="whitespace-nowrap p-3 text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(
                      new Date(member.createdAt),
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  <Users className="mx-auto mb-2 h-5 w-5" />
                  Aucun compte ne correspond à la recherche.
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
        L’API actuelle gère les rôles membre et administrateur. Les autres rôles,
        suspensions et bannissements ne sont pas encore pris en charge.
      </p>
    </div>
  );
}
