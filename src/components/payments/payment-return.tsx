"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  BadgeCheck,
  BookOpen,
  CircleHelp,
  LoaderCircle,
  RotateCw,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Payment = {
  reference: string;
  status: "PENDING" | "PAID" | "FAILED" | "CANCELLED";
  amountPaid: number;
  currency: string;
  course: { id: string; title: string } | null;
};

type LookupState =
  | { kind: "loading" }
  | { kind: "missing-reference" }
  | { kind: "not-found" }
  | { kind: "error"; message: string }
  | { kind: "payment"; payment: Payment; checking: boolean };

function isPayment(value: unknown): value is Payment {
  return (
    typeof value === "object" &&
    value !== null &&
    "reference" in value &&
    typeof value.reference === "string" &&
    "status" in value &&
    (value.status === "PENDING" ||
      value.status === "PAID" ||
      value.status === "FAILED" ||
      value.status === "CANCELLED") &&
    "amountPaid" in value &&
    typeof value.amountPaid === "number" &&
    "currency" in value &&
    typeof value.currency === "string" &&
    "course" in value
  );
}

function PaymentReturnContent({ returnedFrom }: { returnedFrom: "success" | "cancel" }) {
  const searchParams = useSearchParams();
  const reference = searchParams.get("reference")?.trim() ?? "";
  const hasReturnParameters = Boolean(reference);
  const [state, setState] = useState<LookupState>({ kind: "loading" });
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!hasReturnParameters) return;

    const controller = new AbortController();
    let active = true;

    const checkPayment = async () => {
      try {
        for (let attempt = 0; attempt < 16; attempt += 1) {
          const query = new URLSearchParams({ reference });
          const response = await fetch(`/api/payments/return?${query}`, {
            cache: "no-store",
            signal: controller.signal,
          });
          const result: unknown = await response.json().catch(() => null);
          if (!active) return;
          if (!response.ok) {
            const message =
              result &&
              typeof result === "object" &&
              "message" in result &&
              typeof result.message === "string"
                ? result.message
                : "Impossible de vérifier le statut du paiement.";
            throw new Error(message);
          }
          if (!isPayment(result) || result.reference !== reference) {
            setState({ kind: "not-found" });
            return;
          }
          const checking = result.status === "PENDING" && attempt < 15;
          setState({ kind: "payment", payment: result, checking });
          if (!checking) return;
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(resolve, 3000);
            controller.signal.addEventListener(
              "abort",
              () => {
                clearTimeout(timeout);
                reject(new DOMException("Aborted", "AbortError"));
              },
              { once: true },
            );
          });
        }
      } catch (error) {
        if (!active || (error instanceof DOMException && error.name === "AbortError")) {
          return;
        }
        setState({
          kind: "error",
          message:
            error instanceof Error
              ? error.message
              : "Impossible de vérifier le statut du paiement.",
        });
      }
    };

    void checkPayment();
    return () => {
      active = false;
      controller.abort();
    };
  }, [hasReturnParameters, reference, retryCount]);

  const displayState: LookupState = hasReturnParameters
    ? state
    : { kind: "missing-reference" };
  const payment = displayState.kind === "payment" ? displayState.payment : null;
  const title =
    payment?.status === "PAID"
      ? "Paiement confirmé"
      : payment?.status === "FAILED"
        ? "Paiement échoué"
        : payment?.status === "CANCELLED"
          ? "Paiement annulé"
          : returnedFrom === "cancel"
            ? "Retour du paiement"
            : "Vérification du paiement";

  return (
    <main className="mx-auto flex min-h-[55vh] max-w-xl items-center px-4 py-12">
      <section className="w-full rounded-2xl border bg-card p-6 text-center shadow-sm sm:p-8">
        {displayState.kind === "loading" && (
          <>
            <LoaderCircle className="mx-auto h-10 w-10 animate-spin text-primary" />
            <h1 className="mt-4 font-bricolage text-2xl font-bold">
              Vérification du paiement…
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Nous attendons la confirmation sécurisée de PayTech.
            </p>
          </>
        )}
        {displayState.kind === "payment" && (
          <>
            {payment?.status === "PAID" ? (
              <BadgeCheck className="mx-auto h-11 w-11 text-primary" />
            ) : payment?.status === "PENDING" && displayState.checking ? (
              <LoaderCircle className="mx-auto h-11 w-11 animate-spin text-primary" />
            ) : payment?.status === "PENDING" ? (
              <CircleHelp className="mx-auto h-11 w-11 text-accent" />
            ) : payment?.status === "CANCELLED" ? (
              <CircleHelp className="mx-auto h-11 w-11 text-accent" />
            ) : (
              <XCircle className="mx-auto h-11 w-11 text-accent" />
            )}
            <h1 className="mt-4 font-bricolage text-2xl font-bold">{title}</h1>
            {payment?.status === "PENDING" ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {displayState.checking
                  ? "La confirmation sécurisée de PayTech n’est pas encore arrivée. Le statut est vérifié automatiquement. Ne relance pas un deuxième paiement."
                  : "Le paiement est toujours en attente. Ne paie pas une seconde fois. Vérifie ton historique ou contacte l’équipe avec cette référence si la confirmation tarde."}
              </p>
            ) : payment?.status === "PAID" ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {payment.course
                  ? `Ton inscription au cours « ${payment.course.title} » est confirmée.`
                  : "Ton paiement est confirmé."}
              </p>
            ) : payment?.status === "CANCELLED" ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Le paiement n’a pas été finalisé. Aucun accès payant n’a été
                activé.
              </p>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">
                PayTech a signalé un échec. Aucun accès payant n’a été activé.
              </p>
            )}
            <p className="mt-4 break-all font-mono text-xs text-muted-foreground">
              Référence : {payment?.reference}
            </p>
            {payment && (
              <p className="mt-1 text-sm font-semibold">
                {new Intl.NumberFormat("fr-FR").format(payment.amountPaid)}{" "}
                {payment.currency}
              </p>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {payment?.status === "PAID" && payment.course && (
                <Button asChild>
                  <Link href={`/cours/${encodeURIComponent(payment.course.id)}`}>
                    <BookOpen className="h-4 w-4" /> Accéder au cours
                  </Link>
                </Button>
              )}
              {payment?.course && payment.status !== "PAID" && (
                <Button variant="outline" asChild>
                  <Link href={`/cours/${encodeURIComponent(payment.course.id)}`}>
                    Retour au cours
                  </Link>
                </Button>
              )}
              {payment?.status === "PENDING" && !displayState.checking && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setState({ kind: "loading" });
                    setRetryCount((count) => count + 1);
                  }}
                >
                  <RotateCw className="h-4 w-4" /> Vérifier à nouveau
                </Button>
              )}
              <Button variant="ghost" asChild>
                <Link href="/profil">Voir mon profil</Link>
              </Button>
            </div>
          </>
        )}
        {(displayState.kind === "missing-reference" ||
          displayState.kind === "not-found" ||
          displayState.kind === "error") && (
          <>
            <CircleHelp className="mx-auto h-11 w-11 text-accent" />
            <h1 className="mt-4 font-bricolage text-2xl font-bold">
              {displayState.kind === "missing-reference"
                ? "Référence de paiement manquante"
                : displayState.kind === "not-found"
                  ? "Paiement introuvable"
                  : "Vérification impossible"}
            </h1>
            <p role={displayState.kind === "error" ? "alert" : undefined} className="mt-2 text-sm text-muted-foreground">
              {displayState.kind === "error"
                ? displayState.message
                : "Le lien de retour du paiement est incomplet ou invalide. Vérifie ton historique de paiements ou contacte l’équipe avec ta référence PayTech."}
            </p>
            <Button variant="outline" className="mt-6" onClick={() => window.location.reload()}>
              <RotateCw className="h-4 w-4" /> Réessayer
            </Button>
          </>
        )}
      </section>
    </main>
  );
}

export function PaymentReturn({ returnedFrom }: { returnedFrom: "success" | "cancel" }) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-[55vh] items-center justify-center">
          <LoaderCircle className="h-6 w-6 animate-spin text-primary" />
        </main>
      }
    >
      <PaymentReturnContent returnedFrom={returnedFrom} />
    </Suspense>
  );
}
