"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, LoaderCircle, MailX } from "lucide-react";
import { Button } from "@/components/ui/button";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") ?? "";
  const subscriberId = searchParams.get("subscriberId") ?? "";
  const token = searchParams.get("token") ?? "";
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const unsubscribe = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/newsletter/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(subscriberId ? { subscriberId } : { userId }),
          token,
        }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          result &&
          typeof result === "object" &&
          "message" in result &&
          typeof result.message === "string"
            ? result.message
            : "Impossible de modifier l’abonnement.";
        throw new Error(message);
      }
      setDone(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Impossible de modifier l’abonnement.",
      );
    } finally {
      setLoading(false);
    }
  };

  const validLink =
    (userId.length > 0 || subscriberId.length > 0) &&
    /^[\da-zA-Z_-]{43}$/.test(token);

  return (
    <main className="mx-auto flex min-h-[55vh] max-w-xl items-center px-4 py-12">
      <section className="w-full rounded-2xl border bg-card p-6 text-center shadow-sm sm:p-8">
        {done ? (
          <>
            <CheckCircle2 className="mx-auto h-11 w-11 text-primary" />
            <h1 className="mt-4 font-bricolage text-2xl font-bold">
              Désabonnement confirmé
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Tu ne recevras plus les annonces de la newsletter. Les e-mails
              indispensables au fonctionnement de ton compte ne sont pas concernés.
            </p>
            <Button asChild className="mt-6">
              <Link href="/">Retour au site</Link>
            </Button>
          </>
        ) : (
          <>
            <MailX className="mx-auto h-11 w-11 text-primary" />
            <h1 className="mt-4 font-bricolage text-2xl font-bold">
              Se désabonner de la newsletter
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Confirme que tu ne souhaites plus recevoir les annonces par e-mail.
            </p>
            {error && (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild variant="outline">
                <Link href="/">Annuler</Link>
              </Button>
              <Button
                onClick={() => void unsubscribe()}
                disabled={!validLink || loading}
              >
                {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
                Confirmer le désabonnement
              </Button>
            </div>
            {!validLink && (
              <p className="mt-4 text-xs text-muted-foreground">
                Ce lien de désabonnement est invalide.
              </p>
            )}
          </>
        )}
      </section>
    </main>
  );
}

export default function NewsletterUnsubscribePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex min-h-[55vh] max-w-xl items-center justify-center px-4 py-12">
          <LoaderCircle className="h-6 w-6 animate-spin text-muted-foreground" />
        </main>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}
