"use client";

import { useEffect, useState } from "react";
import {
  BadgeDollarSign,
  BookOpen,
  CalendarClock,
  CircleAlert,
  ClipboardCheck,
  CreditCard,
  LoaderCircle,
  Users,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type DashboardData = {
  generatedAt: string;
  members: number;
  administrators: number;
  newMembersWeek: number;
  newMembersMonth: number;
  activeRegistrations: number;
  baseRegistrations: number;
  advancedRegistrations: number;
  paidPayments: number;
  revenue: { day: number; week: number; month: number; currency: string };
  pendingProjects: number;
  projectsAwaitingReview: Array<{
    id: string;
    title: string;
    submittedAt: string;
    user: { name: string };
    course: { title: string };
  }>;
  endingRegistrations: number;
  recentMembers: Array<{
    id: string;
    name: string;
    email: string;
    createdAt: string;
  }>;
  pricingConfigured: boolean;
};

const numberFormat = new Intl.NumberFormat("fr-FR");

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/admin/dashboard", { cache: "no-store" })
      .then(async (response) => {
        const result: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            result &&
            typeof result === "object" &&
            "message" in result &&
            typeof result.message === "string"
              ? result.message
              : "Impossible de charger le tableau de bord.";
          throw new Error(message);
        }
        return result as DashboardData;
      })
      .then((result) => {
        if (active) setData(result);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Impossible de charger le tableau de bord.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const cards = data
    ? [
        {
          label: "Membres inscrits",
          value: numberFormat.format(data.members),
          icon: Users,
        },
        {
          label: "Nouvelles inscriptions · 7 j",
          value: numberFormat.format(data.newMembersWeek),
          icon: Users,
        },
        {
          label: "Accès actifs aux cours",
          value: numberFormat.format(data.activeRegistrations),
          icon: BookOpen,
        },
        {
          label: "Paiements réussis",
          value: numberFormat.format(data.paidPayments),
          icon: CreditCard,
        },
        {
          label: "Revenus aujourd’hui",
          value: `${numberFormat.format(data.revenue.day)} ${data.revenue.currency}`,
          icon: BadgeDollarSign,
        },
        {
          label: "Revenus cette semaine",
          value: `${numberFormat.format(data.revenue.week)} ${data.revenue.currency}`,
          icon: BadgeDollarSign,
        },
        {
          label: "Revenus ce mois",
          value: `${numberFormat.format(data.revenue.month)} ${data.revenue.currency}`,
          icon: BadgeDollarSign,
        },
        {
          label: "Accès bientôt terminés",
          value: numberFormat.format(data.endingRegistrations),
          icon: CalendarClock,
        },
      ]
    : [];

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-accent/20 bg-accent/10 p-4 text-sm text-accent"
        >
          ! {error}
        </p>
      )}
      {!data && !error && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border bg-card p-10 text-sm text-muted-foreground">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Chargement des données…
        </div>
      )}
      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {cards.map(({ label, value, icon: Icon }) => (
              <Card key={label}>
                <CardContent className="p-4 sm:p-5">
                  <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="font-bricolage text-xl font-extrabold sm:text-2xl">
                    {value}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-bricolage font-bold">
                      Projets à évaluer
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {data.pendingProjects} en attente ·{" "}
                      {data.baseRegistrations} accès base ·{" "}
                      {data.advancedRegistrations} accès avancés
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/admin/projets">Ouvrir</Link>
                  </Button>
                </div>
                <div className="mt-4 flex flex-col divide-y">
                  {data.projectsAwaitingReview.length ? (
                    data.projectsAwaitingReview.map((project) => {
                      const age = Math.floor(
                        (new Date(data.generatedAt).getTime() -
                          new Date(project.submittedAt).getTime()) /
                          86_400_000,
                      );
                      return (
                        <div
                          key={project.id}
                          className="flex items-center justify-between gap-3 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">
                              {project.title}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {project.user.name} · {project.course.title}
                            </p>
                          </div>
                          <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                            {age > 5 && (
                              <CircleAlert className="h-3.5 w-3.5 text-accent" />
                            )}
                            {age} j
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <p className="py-5 text-sm text-muted-foreground">
                      Aucun projet en attente.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-bricolage font-bold">
                      Membres récents
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {data.newMembersMonth} nouvelles inscriptions ce mois
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href="/admin/membres">Voir les membres</Link>
                  </Button>
                </div>
                <div className="mt-4 flex flex-col divide-y">
                  {data.recentMembers.length ? (
                    data.recentMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between gap-3 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {member.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {member.email}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {new Intl.DateTimeFormat("fr-FR", {
                            dateStyle: "medium",
                          }).format(new Date(member.createdAt))}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="py-5 text-sm text-muted-foreground">
                      Aucun membre inscrit.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {!data.pricingConfigured && (
            <div className="flex flex-col gap-3 rounded-2xl border border-accent/20 bg-accent/10 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-accent">
                ! Des paramètres de tarification ne sont pas initialisés.
              </p>
              <Button
                asChild
                variant="outline"
                className="border-accent/30 text-accent"
              >
                <Link href="/admin/tarifs">
                  <ClipboardCheck className="h-4 w-4" />
                  Vérifier les tarifs
                </Link>
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Mis à jour le{" "}
            {new Intl.DateTimeFormat("fr-FR", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(data.generatedAt))}
          </p>
        </>
      )}
    </div>
  );
}
