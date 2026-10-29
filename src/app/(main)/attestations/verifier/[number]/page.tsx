"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, CircleAlert, LoaderCircle } from "lucide-react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";

type Verification = {
  valid: boolean;
  withdrawn?: boolean;
  message: string;
  number?: string;
  name?: string | null;
  course?: string;
  instructor?: string;
  issuedAt?: string;
  notice?: string;
};

export default function VerifyAttestationPage() {
  const { number } = useParams<{ number: string }>();
  const [verification, setVerification] = useState<Verification | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const verify = async () => {
      try {
        const response = await fetch(
          `/api/attestations/verify/${encodeURIComponent(number)}`,
          { cache: "no-store" },
        );
        const result: unknown = await response.json().catch(() => null);
        if (!response.ok || !result || typeof result !== "object") {
          throw new Error("Impossible de vérifier cette attestation.");
        }
        setVerification(result as Verification);
      } catch (verificationError) {
        setError(
          verificationError instanceof Error
            ? verificationError.message
            : "Impossible de vérifier cette attestation.",
        );
      }
    };
    void verify();
  }, [number]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <Card>
        <CardContent className="p-8">
          <h1 className="font-bricolage text-2xl font-bold">
            Vérification d’attestation
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Numéro : <span className="font-mono">{number}</span>
          </p>
          {!verification && !error ? (
            <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Vérification en cours…
            </p>
          ) : error ? (
            <p role="alert" className="mt-6 text-sm text-destructive">
              {error}
            </p>
          ) : verification?.valid ? (
            <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-5">
              <p className="flex items-center gap-2 font-semibold text-primary">
                <BadgeCheck className="h-5 w-5" />
                Attestation valide
              </p>
              {verification.name && (
                <p className="mt-4 text-sm">
                  Titulaire : <strong>{verification.name}</strong>
                </p>
              )}
              {verification.course && (
                <p className="mt-2 text-sm">
                  Cours : <strong>{verification.course}</strong>
                </p>
              )}
              {verification.instructor && (
                <p className="mt-2 text-sm">
                  Formateur : {verification.instructor}
                </p>
              )}
              {verification.issuedAt && (
                <p className="mt-2 text-sm">
                  Date de délivrance :{" "}
                  {new Intl.DateTimeFormat("fr-FR", {
                    dateStyle: "long",
                  }).format(new Date(verification.issuedAt))}
                </p>
              )}
              {verification.notice && (
                <p className="mt-4 border-t pt-4 text-xs text-muted-foreground">
                  {verification.notice}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-6 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
              <CircleAlert className="h-5 w-5 shrink-0" />
              {verification?.message ?? "Attestation invalide."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
