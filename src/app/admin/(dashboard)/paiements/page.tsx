"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, LoaderCircle, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { usePagination } from "@/hooks/use-pagination";

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
  manualVerifiedAt: string | null;
  manualVerifier: { id: string; name: string } | null;
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
  const [payTechStatus, setPayTechStatus] = useState<PayTechStatus | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusError, setStatusError] = useState("");
  const [status, setStatus] = useState("ALL");
  const [search, setSearch] = useState("");
  const [manualPayment, setManualPayment] = useState<Payment | null>(null);
  const [manualMethod, setManualMethod] = useState("");
  const [providerReference, setProviderReference] = useState("");
  const [confirmedInPayTech, setConfirmedInPayTech] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [resendingReceipts, setResendingReceipts] = useState(false);

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
          `${payment.reference} ${payment.user.name} ${payment.user.email} ${payment.course?.title ?? ""}`.toLowerCase();
        return matchesStatus && searchable.includes(search.toLowerCase());
      }),
    [payments, search, status],
  );
  const pagination = usePagination(filtered);

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

  const confirmPayment = async () => {
    if (!manualPayment || !confirmedInPayTech) return;
    setConfirming(true);
    setActionError("");
    try {
      const response = await fetch(
        `/api/admin/payments/${encodeURIComponent(manualPayment.reference)}/confirm`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: manualMethod,
            providerReference: providerReference.trim(),
            confirmedInPayTech,
          }),
        },
      );
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          result &&
          typeof result === "object" &&
          "message" in result &&
          typeof result.message === "string"
            ? result.message
            : "Impossible de confirmer le paiement.";
        throw new Error(message);
      }
      setManualPayment(null);
      setProviderReference("");
      setConfirmedInPayTech(false);
      await refresh();
    } catch (confirmationError) {
      setActionError(
        confirmationError instanceof Error
          ? confirmationError.message
          : "Impossible de confirmer le paiement.",
      );
    } finally {
      setConfirming(false);
    }
  };

  const resendReceipts = async () => {
    if (
      !window.confirm(
        "Renvoyer le reçu PDF actualisé par e-mail à tous les membres ayant déjà reçu un reçu pour un paiement confirmé ?",
      )
    ) {
      return;
    }
    setResendingReceipts(true);
    setActionError("");
    setActionNotice("");
    try {
      const response = await fetch("/api/admin/payments/resend-receipts", {
        method: "POST",
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          result &&
          typeof result === "object" &&
          "message" in result &&
          typeof result.message === "string"
            ? result.message
            : "Impossible de mettre les reçus à jour en file d’envoi.";
        throw new Error(message);
      }
      const queued =
        result &&
        typeof result === "object" &&
        "queued" in result &&
        typeof result.queued === "number"
          ? result.queued
          : null;
      if (queued === null) {
        throw new Error("La réponse de renvoi des reçus est invalide.");
      }
      setActionNotice(
        queued
          ? `${queued} reçu(s) mis en file pour renvoi. L’envoi commencera dans la prochaine minute.`
          : "Aucun reçu déjà envoyé n’est à renvoyer.",
      );
    } catch (resendError) {
      setActionError(
        resendError instanceof Error
          ? resendError.message
          : "Impossible de mettre les reçus à jour en file d’envoi.",
      );
    } finally {
      setResendingReceipts(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {manualPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-payment-title"
            className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-xl"
          >
            <h2 id="confirm-payment-title" className="text-lg font-bold">
              Confirmer le paiement dans l’administration
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Référence {manualPayment.reference} —{" "}
              {money.format(manualPayment.amountPaid)} {manualPayment.currency}
            </p>
            <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              À utiliser uniquement si le tableau de bord marchand PayTech
              indique que cette transaction est réussie. Cette action donnera
              immédiatement accès au cours ou à l’attestation.
            </p>
            <label className="mt-4 flex flex-col gap-2 text-sm font-medium">
              Moyen utilisé
              <select
                value={manualMethod}
                onChange={(event) => setManualMethod(event.target.value)}
                className="h-11 rounded-xl border border-input bg-background px-3"
              >
                <option value="" disabled>
                  Sélectionnez le moyen confirmé
                </option>
                <option value="WAVE">Wave</option>
                <option value="ORANGE_MONEY">Orange Money</option>
              </select>
            </label>
            <label className="mt-4 flex flex-col gap-2 text-sm font-medium">
              Référence de la transaction PayTech
              <Input
                value={providerReference}
                onChange={(event) => setProviderReference(event.target.value)}
                maxLength={100}
                required
                placeholder="Référence visible dans PayTech"
              />
            </label>
            <label className="mt-4 flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={confirmedInPayTech}
                onChange={(event) =>
                  setConfirmedInPayTech(event.target.checked)
                }
                className="mt-1"
              />
              <span>
                J’ai vérifié dans PayTech que cette transaction est réussie et
                que son montant correspond.
              </span>
            </label>
            {actionError && (
              <p role="alert" className="mt-3 text-sm text-accent">
                {actionError}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setManualPayment(null);
                  setActionError("");
                }}
                disabled={confirming}
              >
                Annuler
              </Button>
              <Button
                onClick={() => void confirmPayment()}
                disabled={
                  confirming ||
                  !manualMethod ||
                  !confirmedInPayTech ||
                  !providerReference.trim()
                }
              >
                {confirming && (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                )}
                Confirmer le paiement
              </Button>
            </div>
          </section>
        </div>
      )}
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
        <p
          role="alert"
          className="rounded-xl border border-accent/20 bg-accent/10 p-4 text-sm text-accent"
        >
          ! {error}
        </p>
      )}
      {actionError && !manualPayment && (
        <p
          role="alert"
          className="rounded-xl border border-accent/20 bg-accent/10 p-4 text-sm text-accent"
        >
          {actionError}
        </p>
      )}
      {actionNotice && (
        <p
          role="status"
          className="rounded-xl border border-primary/20 bg-primary/10 p-4 text-sm text-primary"
        >
          {actionNotice}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          value={search}
          onChange={(event) => { setSearch(event.target.value); pagination.setPage(1); }}
          placeholder="Rechercher membre, cours ou référence"
          className="rounded-xl"
        />
        <select
          value={status}
          onChange={(event) => { setStatus(event.target.value); pagination.setPage(1); }}
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
        <Button
          onClick={() => void resendReceipts()}
          variant="outline"
          className="gap-2"
          disabled={resendingReceipts}
        >
          {resendingReceipts ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <MailCheck className="h-4 w-4" />
          )}
          Renvoyer les reçus PDF actualisés
        </Button>
      </div>
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="p-3">Membre</th>
              <th className="p-3">Objet</th>
              <th className="p-3">Montant payé</th>
              <th className="p-3">Moyen</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Date</th>
              <th className="p-3">Référence</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={8}
                  className="p-8 text-center text-muted-foreground"
                >
                  <LoaderCircle className="mx-auto h-5 w-5 animate-spin" />
                  <span className="mt-2 block">Chargement des paiements…</span>
                </td>
              </tr>
            ) : filtered.length ? (
              pagination.pageItems.map((payment) => (
                <tr key={payment.id} className="border-t align-top">
                  <td className="p-3">
                    <p className="font-medium">{payment.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {payment.user.email}
                    </p>
                  </td>
                  <td className="p-3">
                    <p>{objectLabels[payment.object] ?? payment.object}</p>
                    {payment.course && (
                      <p className="text-xs text-muted-foreground">
                        {payment.course.title}
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap p-3 font-semibold">
                    {money.format(payment.amountPaid)} {payment.currency}
                    {payment.discountAmount > 0 && (
                      <p className="text-xs font-normal text-muted-foreground">
                        Référence : {money.format(payment.amountBeforePromo)} ·
                        code {payment.promoCode}
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap p-3">
                    {payment.status !== "PAID"
                      ? "À confirmer"
                      : payment.method === "ORANGE_MONEY"
                        ? "Orange Money"
                        : "Wave"}
                  </td>
                  <td className="p-3">
                    {statusLabels[payment.status] ?? payment.status}
                    {payment.manualVerifiedAt && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Vérifié manuellement par{" "}
                        {payment.manualVerifier?.name ?? "administration"}
                      </p>
                    )}
                    {payment.manualVerifiedAt && payment.providerReference && (
                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        Réf. PayTech : {payment.providerReference}
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap p-3">
                    {new Intl.DateTimeFormat("fr-FR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(payment.createdAt))}
                  </td>
                  <td className="max-w-40 break-all p-3 font-mono text-xs">
                    {payment.reference}
                  </td>
                  <td className="p-3">
                    {payment.status === "PENDING" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setManualPayment(payment);
                          setManualMethod("");
                          setProviderReference("");
                          setConfirmedInPayTech(false);
                          setActionError("");
                        }}
                      >
                        Confirmer manuellement
                      </Button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={8}
                  className="p-8 text-center text-muted-foreground"
                >
                  Aucun paiement ne correspond aux filtres.
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
        Toute confirmation manuelle exige la vérification préalable du paiement
        dans PayTech et en conserve la trace.
      </p>
    </div>
  );
}
