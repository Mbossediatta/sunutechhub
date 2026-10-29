"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  Calendar,
  CheckCircle2,
  ExternalLink,
  FolderGit2,
  MapPin,
  MessageSquare,
  Pencil,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { usePagination } from "@/hooks/use-pagination";

type Profile = {
  id: string;
  name: string;
  email: string;
  city: string | null;
  bio: string | null;
  interests: string[];
  createdAt: string;
  registrations: {
    id: string;
    endsAt: string | null;
    course: { id: string; title: string; isFree: boolean };
  }[];
  _count: { questions: number; answers: number; projects: number };
};

type Payment = {
  reference: string;
  object: string;
  status: "PENDING" | "PAID" | "FAILED" | "CANCELLED";
  amountPaid: number;
  currency: string;
  method: "WAVE" | "ORANGE_MONEY";
  createdAt: string;
  paidAt: string | null;
  course: { id: string; title: string } | null;
};

type Attestation = {
  number: string;
  status: "ACTIVE" | "REVOKED";
  issuedAt: string;
  course: { title: string; instructorName: string };
};

const paymentLabels: Record<Payment["status"], string> = {
  PENDING: "En attente",
  PAID: "Réussi",
  FAILED: "Échoué",
  CANCELLED: "Annulé",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function ProfilPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsError, setPaymentsError] = useState("");
  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [attestationsError, setAttestationsError] = useState("");
  const registrationsPagination = usePagination(profile?.registrations ?? []);
  const paymentsPagination = usePagination(payments);
  const attestationsPagination = usePagination(attestations);

  useEffect(() => {
    const loadMemberArea = async () => {
      const [profileResult, paymentResult, attestationResult] =
        await Promise.allSettled([
          fetch("/api/auth/me", { cache: "no-store" }),
          fetch("/api/payments/mine", { cache: "no-store" }),
          fetch("/api/attestations/mine", { cache: "no-store" }),
        ]);

      const readJson = async (result: PromiseSettledResult<Response>) => {
        if (result.status === "rejected") throw result.reason;
        const payload: unknown = await result.value.json().catch(() => null);
        if (!result.value.ok) {
          const message =
            payload &&
            typeof payload === "object" &&
            "message" in payload &&
            typeof payload.message === "string"
              ? payload.message
              : "Impossible de charger ces informations.";
          throw new Error(message);
        }
        return payload;
      };

      try {
        setProfile((await readJson(profileResult)) as Profile);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Impossible de charger votre profil.",
        );
      }

      try {
        const result = await readJson(paymentResult);
        if (!Array.isArray(result))
          throw new Error("Historique des paiements invalide.");
        setPayments(result as Payment[]);
      } catch (loadError) {
        setPaymentsError(
          loadError instanceof Error
            ? loadError.message
            : "Impossible de charger les paiements.",
        );
      }

      try {
        const result = await readJson(attestationResult);
        if (!Array.isArray(result))
          throw new Error("Liste des attestations invalide.");
        setAttestations(result as Attestation[]);
      } catch (loadError) {
        setAttestationsError(
          loadError instanceof Error
            ? loadError.message
            : "Impossible de charger les attestations.",
        );
      }
    };

    void loadMemberArea();
  }, []);

  if (error)
    return (
      <p
        role="alert"
        className="mx-auto max-w-4xl px-4 py-10 text-sm text-destructive"
      >
        {error}
      </p>
    );
  if (!profile)
    return (
      <p className="mx-auto max-w-4xl px-4 py-10 text-sm text-muted-foreground">
        Chargement du profil…
      </p>
    );

  const stats = [
    {
      icon: MessageSquare,
      value: profile._count.questions,
      label: "Questions",
    },
    { icon: CheckCircle2, value: profile._count.answers, label: "Réponses" },
    { icon: FolderGit2, value: profile._count.projects, label: "Projets" },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col items-start gap-5 sm:flex-row">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-primary/10 font-bricolage text-2xl font-bold text-primary">
              {getInitials(profile.name)}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="mb-2 font-bricolage text-2xl font-bold">
                {profile.name}
              </h1>
              <div className="mb-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                {profile.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {profile.city}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Membre depuis{" "}
                  {new Intl.DateTimeFormat("fr-FR", {
                    month: "long",
                    year: "numeric",
                  }).format(new Date(profile.createdAt))}
                </span>
              </div>
              <p className="mb-4 whitespace-pre-wrap text-sm">
                {profile.bio || "Aucune biographie renseignée."}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {profile.interests.map((interest) => (
                  <Badge key={interest} variant="outline">
                    {interest}
                  </Badge>
                ))}
              </div>
            </div>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/profil/modifier">
                <Pencil className="h-3.5 w-3.5" /> Modifier
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex flex-col items-center gap-2 p-5 text-center">
              <stat.icon className="h-5 w-5 text-primary" />
              <span className="font-bricolage text-2xl font-extrabold text-primary">
                {stat.value}
              </span>
              <span className="text-xs text-muted-foreground">
                {stat.label}
              </span>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-5 font-bricolage text-lg font-bold">Mes cours</h2>
          {profile.registrations.length ? (
            <div className="flex flex-col gap-3">
              {registrationsPagination.pageItems.map(({ id, endsAt, course }) => {
                const active = !endsAt || new Date(endsAt) > new Date();
                return (
                  <Link
                    key={id}
                    href={`/cours/${course.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border p-4 hover:border-primary"
                  >
                    <span className="text-sm font-medium">{course.title}</span>
                    <Badge variant={active ? "secondary" : "outline"}>
                      {active ? "Actif" : "Expiré"}
                    </Badge>
                  </Link>
                );
              })}
              <PaginationControls
                page={registrationsPagination.page}
                pageSize={registrationsPagination.pageSize}
                totalItems={registrationsPagination.totalItems}
                totalPages={registrationsPagination.totalPages}
                onPageChange={registrationsPagination.setPage}
                onPageSizeChange={registrationsPagination.setPageSize}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun cours actif pour le moment.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="p-6">
          <h2 className="mb-5 font-bricolage text-lg font-bold">
            Mes paiements
          </h2>
          {paymentsError ? (
            <p role="alert" className="text-sm text-destructive">
              {paymentsError}
            </p>
          ) : payments.length ? (
            <div className="flex flex-col gap-3">
              {paymentsPagination.pageItems.map((payment) => (
                <div
                  key={payment.reference}
                  className="flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {payment.course?.title ?? "Attestation de réussite"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat("fr-FR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(payment.paidAt ?? payment.createdAt))}
                      {" · "}
                      {payment.status !== "PAID"
                        ? "Moyen à confirmer"
                        : payment.method === "ORANGE_MONEY"
                          ? "Orange Money"
                          : "Wave"}
                      {" · Réf. "}
                      {payment.reference}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {new Intl.NumberFormat("fr-FR").format(
                          payment.amountPaid,
                        )}{" "}
                        {payment.currency}
                      </p>
                      <Badge
                        variant={
                          payment.status === "PAID" ? "secondary" : "outline"
                        }
                      >
                        {paymentLabels[payment.status]}
                      </Badge>
                    </div>
                    {payment.status === "PAID" && (
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={`/api/payments/${encodeURIComponent(payment.reference)}/receipt`}
                          download
                        >
                          <ArrowDownToLine className="h-4 w-4" />
                          Reçu
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <PaginationControls
                page={paymentsPagination.page}
                pageSize={paymentsPagination.pageSize}
                totalItems={paymentsPagination.totalItems}
                totalPages={paymentsPagination.totalPages}
                onPageChange={paymentsPagination.setPage}
                onPageSizeChange={paymentsPagination.setPageSize}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun paiement pour le moment.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardContent className="p-6">
          <h2 className="mb-5 font-bricolage text-lg font-bold">
            Mes attestations
          </h2>
          {attestationsError ? (
            <p role="alert" className="text-sm text-destructive">
              {attestationsError}
            </p>
          ) : attestations.length ? (
            <div className="flex flex-col gap-3">
              {attestationsPagination.pageItems.map((attestation) => (
                <div
                  key={attestation.number}
                  className="flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {attestation.course.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      N° {attestation.number} · délivrée le{" "}
                      {new Intl.DateTimeFormat("fr-FR", {
                        dateStyle: "medium",
                      }).format(new Date(attestation.issuedAt))}
                    </p>
                    <Badge
                      className="mt-2"
                      variant={
                        attestation.status === "ACTIVE"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {attestation.status === "ACTIVE" ? "Valide" : "Retirée"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {attestation.status === "ACTIVE" && (
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={`/api/attestations/${encodeURIComponent(attestation.number)}/pdf`}
                          download
                        >
                          <ArrowDownToLine className="h-4 w-4" />
                          Télécharger le PDF
                        </a>
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" asChild>
                      <Link
                        href={`/attestations/verifier/${encodeURIComponent(attestation.number)}`}
                      >
                        <ExternalLink className="h-4 w-4" />
                        Vérifier
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
              <PaginationControls
                page={attestationsPagination.page}
                pageSize={attestationsPagination.pageSize}
                totalItems={attestationsPagination.totalItems}
                totalPages={attestationsPagination.totalPages}
                onPageChange={attestationsPagination.setPage}
                onPageSizeChange={attestationsPagination.setPageSize}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucune attestation pour le moment. Elle est délivrée après
              validation du projet et confirmation du paiement.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
