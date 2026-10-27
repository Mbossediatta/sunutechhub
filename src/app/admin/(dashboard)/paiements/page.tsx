"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Payment = {
  id: string;
  reference: string;
  object: string;
  level: string | null;
  status: string;
  amountBeforePromo: number;
  amountPaid: number;
  discountAmount: number;
  currency: string;
  method: string;
  promoCode: string | null;
  createdAt: string;
  paidAt: string | null;
  providerReference: string | null;
  user: { name: string; email: string };
  course: { title: string } | null;
};

const money = new Intl.NumberFormat("fr-FR");
const objectLabels: Record<string, string> = {
  INSCRIPTION_BASE: "Inscription — base",
  INSCRIPTION_AVANCE: "Inscription — avancée",
  PASSAGE_AVANCE: "Passage en version avancée",
  ATTESTATION: "Attestation de réussite",
};
const statusLabels: Record<string, string> = {
  PENDING: "En attente",
  PAID: "Réussi",
  FAILED: "Échoué",
  CANCELLED: "Annulé",
};

async function loadPayments() {
  const response = await fetch("/api/admin/payments", { cache: "no-store" });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      result &&
      typeof result === "object" &&
      "message" in result &&
      typeof result.message === "string"
        ? result.message
        : "Impossible de charger les paiements.";
    throw new Error(message);
  }
  if (!Array.isArray(result)) throw new Error("Réponse de paiements invalide.");
  return result as Payment[];
}

function csvCell(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export default function AdminPaiementsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setPayments(await loadPayments());
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger les paiements.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(
    () =>
      payments.filter((payment) => {
        const matchesStatus = status === "ALL" || payment.status === status;
        const searchable =
          `${payment.reference} ${payment.user.name} ${payment.user.email} ${payment.course?.title ?? ""}`
            .toLowerCase();
        return matchesStatus && searchable.includes(search.toLowerCase());
      }),
    [payments, search, status],
  );

  const exportCsv = () => {
    const columns = [
      "Référence",
      "Membre",
      "E-mail",
      "Objet",
      "Cours",
      "Montant de référence",
      "Montant payé",
      "Code promo",
      "Moyen",
      "Statut",
      "Date",
      "Référence PayTech",
    ];
    const rows = filtered.map((payment) => [
      payment.reference,
      payment.user.name,
      payment.user.email,
      objectLabels[payment.object] ?? payment.object,
      payment.course?.title,
      payment.amountBeforePromo,
      payment.amountPaid,
      payment.promoCode,
      payment.method,
      statusLabels[payment.status] ?? payment.status,
      new Date(payment.createdAt).toISOString(),
      payment.providerReference,
    ]);
    const content = [columns, ...rows]
      .map((row) => row.map(csvCell).join(";"))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "paiements-sunu-tech-hub.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <p role="alert" className="rounded-xl border border-accent/20 bg-accent/10 p-4 text-sm text-accent">
          ! {error}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher membre, cours ou référence"
          className="rounded-xl"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
        >
          <option value="ALL">Tous les statuts</option>
          <option value="PENDING">En attente</option>
          <option value="PAID">Réussi</option>
          <option value="FAILED">Échoué</option>
          <option value="CANCELLED">Annulé</option>
        </select>
        <Button
          onClick={exportCsv}
          variant="outline"
          className="gap-2"
          disabled={!filtered.length}
        >
          <Download className="h-4 w-4" />
          Exporter CSV
        </Button>
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="p-3">Membre</th>
              <th className="p-3">Objet</th>
              <th className="p-3">Montant payé</th>
              <th className="p-3">Moyen</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Date</th>
              <th className="p-3">Référence</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  <LoaderCircle className="mx-auto h-5 w-5 animate-spin" />
                  <span className="mt-2 block">Chargement des paiements…</span>
                </td>
              </tr>
            ) : filtered.length ? (
              filtered.map((payment) => (
                <tr key={payment.id} className="border-t align-top">
                  <td className="p-3">
                    <p className="font-medium">{payment.user.name}</p>
                    <p className="text-xs text-muted-foreground">{payment.user.email}</p>
                  </td>
                  <td className="p-3">
                    <p>{objectLabels[payment.object] ?? payment.object}</p>
                    {payment.course && (
                      <p className="text-xs text-muted-foreground">{payment.course.title}</p>
                    )}
                  </td>
                  <td className="whitespace-nowrap p-3 font-semibold">
                    {money.format(payment.amountPaid)} {payment.currency}
                    {payment.discountAmount > 0 && (
                      <p className="text-xs font-normal text-muted-foreground">
                        Référence : {money.format(payment.amountBeforePromo)} · code {payment.promoCode}
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap p-3">
                    {payment.method === "ORANGE_MONEY" ? "Orange Money" : "Wave"}
                  </td>
                  <td className="p-3">{statusLabels[payment.status] ?? payment.status}</td>
                  <td className="whitespace-nowrap p-3">
                    {new Intl.DateTimeFormat("fr-FR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(payment.createdAt))}
                  </td>
                  <td className="max-w-40 break-all p-3 font-mono text-xs">
                    {payment.reference}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  Aucun paiement ne correspond aux filtres.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Les remboursements et la vérification manuelle ne sont pas encore pris en charge par l’API.
      </p>
    </div>
  );
}
