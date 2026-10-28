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
  | { kind: "unauthenticated" }
  | { kind: "missing-reference" }
  | { kind: "not-found" }
  | { kind: "error"; message: string }
  | { kind: "payment"; payment: Payment };

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
  const [state, setState] = useState<LookupState>({ kind: "loading" });

  useEffect(() => {
    if (!reference) {
      setState({ kind: "missing-reference" });
      return;
    }

    const controller = new AbortController();
    let active = true;

    const checkPayment = async () => {
      try {
        for (let attempt = 0; attempt < 16; attempt += 1) {
          const response = await fetch("/api/payments/mine", {
            cache: "no-store",
            signal: controller.signal,
          });
          const result: unknown = await response.json().catch(() => null);
          if (!active) return;
          if (response.status === 401) {
            setState({ kind: "unauthenticated" });
            return;
          }
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
          if (!Array.isArray(result)) {
            throw new Error("La réponse des paiements est invalide.");
          }
          const payment = result.find(
            (item: unknown) =>
              isPayment(item) && item.reference === reference,
          );
          if (!payment || !isPayment(payment)) {
            setState({ kind: "not-found" });
            return;
          }
          setState({ kind: "payment", payment });
          if (payment.status !== "PENDING" || attempt === 15) return;
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
  }, [reference]);

  const payment = state.kind === "payment" ? state.payment : null;
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
        {state.kind === "loading" && (
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
        {state.kind === "payment" && (
          <>
            {payment?.status === "PAID" ? (
              <BadgeCheck className="mx-auto h-11 w-11 text-primary" />
            ) : payment?.status === "PENDING" ? (
              <LoaderCircle className="mx-auto h-11 w-11 animate-spin text-primary" />
            ) : payment?.status === "CANCELLED" ? (
              <CircleHelp className="mx-auto h-11 w-11 text-accent" />
            ) : (
              <XCircle className="mx-auto h-11 w-11 text-accent" />
            )}
            <h1 className="mt-4 font-bricolage text-2xl font-bold">{title}</h1>
            {payment?.status === "PENDING" ? (
              <p className="mt-2 text-sm text-muted-foreground">
                La confirmation PayTech n’est pas encore arrivée. Cette page
                vérifie automatiquement le statut. Ne relance pas un deuxième
                paiement entre-temps.
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
              <Button variant="ghost" asChild>
                <Link href="/profil">Voir mon profil</Link>
              </Button>
            </div>
          </>
        )}
        {state.kind === "unauthenticated" && (
          <>
            <CircleHelp className="mx-auto h-11 w-11 text-accent" />
            <h1 className="mt-4 font-bricolage text-2xl font-bold">
              Connecte-toi pour vérifier le paiement
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Le statut est associé au compte qui a démarré le paiement.
            </p>
            <Button className="mt-6" asChild>
              <Link href="/connexion">Se connecter</Link>
            </Button>
          </>
        )}
        {(state.kind === "missing-reference" ||
          state.kind === "not-found" ||
          state.kind === "error") && (
          <>
            <CircleHelp className="mx-auto h-11 w-11 text-accent" />
            <h1 className="mt-4 font-bricolage text-2xl font-bold">
              {state.kind === "missing-reference"
                ? "Référence de paiement manquante"
                : state.kind === "not-found"
                  ? "Paiement introuvable"
                  : "Vérification impossible"}
            </h1>
            <p role={state.kind === "error" ? "alert" : undefined} className="mt-2 text-sm text-muted-foreground">
              {state.kind === "error"
                ? state.message
                : "Vérifie ton historique de paiements ou contacte l’équipe avec ta référence PayTech."}
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
