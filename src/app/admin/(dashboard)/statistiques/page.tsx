"use client";

import { useEffect, useState } from "react";
import {
  BadgeDollarSign,
  BookOpen,
  CalendarDays,
  CreditCard,
  LoaderCircle,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type StatisticsData = {
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
  endingRegistrations: number;
};

const formatNumber = new Intl.NumberFormat("fr-FR");

export default function AdminStatistiquesPage() {
  const [statistics, setStatistics] = useState<StatisticsData | null>(null);
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
              : "Impossible de charger les statistiques.";
          throw new Error(message);
        }
        return result as StatisticsData;
      })
      .then((result) => {
        if (active) setStatistics(result);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Impossible de charger les statistiques.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const cards = statistics
    ? [
        { label: "Membres", value: formatNumber.format(statistics.members), icon: Users },
        { label: "Administrateurs", value: formatNumber.format(statistics.administrators), icon: Users },
        { label: "Nouveaux membres · 7 jours", value: formatNumber.format(statistics.newMembersWeek), icon: CalendarDays },
        { label: "Nouveaux membres · mois", value: formatNumber.format(statistics.newMembersMonth), icon: CalendarDays },
        { label: "Accès actifs aux cours", value: formatNumber.format(statistics.activeRegistrations), icon: BookOpen },
        { label: "Accès de base", value: formatNumber.format(statistics.baseRegistrations), icon: BookOpen },
        { label: "Accès avancés", value: formatNumber.format(statistics.advancedRegistrations), icon: BookOpen },
        { label: "Paiements réussis", value: formatNumber.format(statistics.paidPayments), icon: CreditCard },
        { label: "Revenus aujourd’hui", value: `${formatNumber.format(statistics.revenue.day)} ${statistics.revenue.currency}`, icon: BadgeDollarSign },
        { label: "Revenus cette semaine", value: `${formatNumber.format(statistics.revenue.week)} ${statistics.revenue.currency}`, icon: BadgeDollarSign },
        { label: "Revenus ce mois", value: `${formatNumber.format(statistics.revenue.month)} ${statistics.revenue.currency}`, icon: BadgeDollarSign },
      ]
    : [];

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <p role="alert" className="rounded-xl border border-accent/20 bg-accent/10 p-4 text-sm text-accent">
          ! {error}
        </p>
      )}
      {!statistics && !error && (
        <div className="flex items-center justify-center gap-2 rounded-2xl border bg-card p-10 text-sm text-muted-foreground">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Chargement des statistiques…
        </div>
      )}
      {statistics && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {cards.map(({ label, value, icon: Icon }) => (
              <Card key={label}>
                <CardContent className="p-4 sm:p-5">
                  <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="font-bricolage text-xl font-extrabold">{value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="p-5">
              <h2 className="font-bricolage font-bold">Suivi opérationnel</h2>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-sm text-muted-foreground">Projets en attente d’évaluation</dt>
                  <dd className="mt-1 text-xl font-bold">{formatNumber.format(statistics.pendingProjects)}</dd>
                </div>
                <div>
                  <dt className="text-sm text-muted-foreground">Accès se terminant dans 7 jours</dt>
                  <dd className="mt-1 text-xl font-bold">{formatNumber.format(statistics.endingRegistrations)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">
            Les périodes et montants sont calculés à partir des paiements et inscriptions enregistrés.
            Données mises à jour le{" "}
            {new Intl.DateTimeFormat("fr-FR", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(statistics.generatedAt))}
            .
          </p>
        </>
      )}
    </div>
  );
}
