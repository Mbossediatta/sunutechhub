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

type PayTechStatus = {
  ready: boolean;
  environment: "test" | "prod" | "invalid";
  apiKeyConfigured: boolean;
  apiSecretConfigured: boolean;
  callbackConfigured: boolean;
  callbackUsesHttps: boolean;
  frontendConfigured: boolean;
  issues: string[];
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
  const [payTechStatus, setPayTechStatus] = useState<PayTechStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusError, setStatusError] = useState("");
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

  const refreshPayTechStatus = useCallback(async () => {
    setStatusLoading(true);
    setStatusError("");
    try {
      const response = await fetch("/api/admin/payments/status", {
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
            : "Impossible de vérifier la configuration PayTech.";
        throw new Error(message);
      }
      if (
        !result ||
        typeof result !== "object" ||
        !("ready" in result) ||
        typeof result.ready !== "boolean" ||
        !("issues" in result) ||
        !Array.isArray(result.issues)
      ) {
        throw new Error("La réponse de configuration PayTech est invalide.");
      }
      setPayTechStatus(result as PayTechStatus);
    } catch (statusLoadError) {
      setStatusError(
        statusLoadError instanceof Error
          ? statusLoadError.message
          : "Impossible de vérifier la configuration PayTech.",
      );
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    void refreshPayTechStatus();
  }, [refresh, refreshPayTechStatus]);

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
      <section className="rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-bricolage text-lg font-bold">
              Configuration PayTech
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Diagnostic sans afficher les clés ni les secrets.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void refreshPayTechStatus()}
            disabled={statusLoading}
          >
            {statusLoading && <LoaderCircle className="h-4 w-4 animate-spin" />}
            Vérifier
          </Button>
        </div>
        {statusError ? (
          <p role="alert" className="mt-3 text-sm text-accent">
            {statusError}
          </p>
        ) : statusLoading && !payTechStatus ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Vérification de la configuration…
          </p>
        ) : payTechStatus ? (
          <div className="mt-4">
            <p
              className={`text-sm font-semibold ${payTechStatus.ready ? "text-primary" : "text-accent"}`}
            >
              {payTechStatus.ready
                ? "Configuration présente — mode "
                : "Configuration à corriger — mode "}
              {payTechStatus.environment === "test"
                ? "test"
                : payTechStatus.environment === "prod"
                  ? "production"
                  : "invalide"}
            </p>
            {payTechStatus.issues.length > 0 && (
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
                {payTechStatus.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            )}
            {payTechStatus.ready && (
              <p className="mt-2 text-xs text-muted-foreground">
                Ce diagnostic vérifie les paramètres, pas la réception effective
                du webhook. L’adresse de notification doit être accessible
                publiquement en HTTPS.
              </p>
            )}
          </div>
        ) : null}
      </section>
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
