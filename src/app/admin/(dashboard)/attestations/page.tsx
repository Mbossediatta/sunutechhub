"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Attestation = {
  id: string;
  number: string;
  status: "ACTIVE" | "REVOKED";
  displayNamePublic: boolean;
  issuedAt: string;
  revokedAt: string | null;
  revocationReason: string | null;
  user: { name: string; email: string };
  course: { title: string };
  revokedBy: { name: string } | null;
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

export default function AdminAttestationsPage() {
  const [items, setItems] = useState<Attestation[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setItems(await adminRequest<Attestation[]>("attestations"));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger les attestations.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const revoke = async (item: Attestation) => {
    const reason = window.prompt(
      `Indique le motif du retrait de ${item.number} :`,
    )?.trim();
    if (!reason) return;

    setUpdating(item.number);
    setError("");
    setNotice("");
    try {
      await adminRequest(`attestations/${encodeURIComponent(item.number)}/revoke`, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      });
      setNotice(`L’attestation ${item.number} a été retirée.`);
      await load();
    } catch (revokeError) {
      setError(
        revokeError instanceof Error
          ? revokeError.message
          : "Impossible de retirer l’attestation.",
      );
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
      <div className="flex items-start gap-3 rounded-xl border border-primary/15 bg-primary/5 p-4 text-sm text-muted-foreground">
        <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        Les attestations retirées restent visibles dans le registre. Leur page de
        vérification indique qu’elles ont été retirées.
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="p-3">Numéro</th>
              <th className="p-3">Membre</th>
              <th className="p-3">Cours</th>
              <th className="p-3">Délivrée le</th>
              <th className="p-3">Nom public</th>
              <th className="p-3">Statut</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  <LoaderCircle className="mx-auto h-5 w-5 animate-spin" />
                  <span className="mt-2 block">Chargement des attestations…</span>
                </td>
              </tr>
            ) : items.length ? (
              items.map((item) => (
                <tr key={item.id} className="border-t align-top">
                  <td className="whitespace-nowrap p-3 font-mono text-xs">{item.number}</td>
                  <td className="p-3">
                    <p className="font-medium">{item.user.name}</p>
                    <p className="text-xs text-muted-foreground">{item.user.email}</p>
                  </td>
                  <td className="p-3">{item.course.title}</td>
                  <td className="whitespace-nowrap p-3">
                    {new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(
                      new Date(item.issuedAt),
                    )}
                  </td>
                  <td className="p-3">{item.displayNamePublic ? "Oui" : "Non"}</td>
                  <td className="p-3">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      {item.status === "ACTIVE" ? "Valide" : "Retirée"}
                    </span>
                    {item.revocationReason && (
                      <p className="mt-1 max-w-48 text-xs text-muted-foreground">
                        Motif : {item.revocationReason}
                      </p>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {item.status === "ACTIVE" && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={updating === item.number}
                        onClick={() => revoke(item)}
                      >
                        {updating === item.number && (
                          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        )}
                        Retirer
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">
                  Aucune attestation de réussite à afficher.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
