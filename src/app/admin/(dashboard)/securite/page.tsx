"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  CircleAlert,
  Clock3,
  LoaderCircle,
  LockKeyhole,
  Database,
  Download,
  Server,
  Mail,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type SecurityEvent = {
  id: string;
  eventType: string;
  severity: string;
  sourceIp: string | null;
  userAgent: string | null;
  method: string;
  path: string;
  statusCode: number;
  reason: string | null;
  targetAccount: string | null;
  createdAt: string;
};

type AuditEntry = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
  actor: { name: string; email: string } | null;
};

type Operations = {
  generatedAt: string;
  backend: {
    status: string;
    uptimeSeconds: number;
    nodeVersion: string;
    memoryBytes: { rss: number; heapUsed: number };
  };
  frontend: { status: string };
  database: {
    status: string;
    sizeBytes: string | null;
    lastMigration: { name: string; appliedAt: string } | null;
    tables: Array<{ name: string; rows: number; sizeBytes: string }>;
    error?: string;
  };
  integrations: {
    paytech: { ready: boolean; environment: string };
    email: { configured: boolean };
    sms: { configured: boolean; status: string };
  };
  backups: { configured: boolean; status: string; message: string };
  observability: {
    slowQueries: { configured: boolean };
    errorHistoryDays: number;
  };
  stalePendingPayments: number | null;
};

type SecurityOverview = {
  generatedAt: string;
  retentionDays: number;
  summary: {
    total: number;
    failedLogins: number;
    denied: number;
    rateLimited: number;
  };
  suspiciousSources: Array<{ sourceIp: string; attempts: number }>;
  recentEvents: SecurityEvent[];
};

type ErrorSummary = {
  eventType: string;
  path: string;
  statusCode: number;
  count: number;
  lastSeen: string;
};

const numberFormat = new Intl.NumberFormat("fr-FR");

const eventLabels: Record<string, string> = {
  LOGIN_FAILED: "Échec de connexion",
  LOGIN_SUCCESS: "Connexion réussie",
  UNAUTHENTICATED_REQUEST: "Requête sans session",
  ACCESS_DENIED: "Accès refusé",
  RATE_LIMITED: "Limite de requêtes dépassée",
  ADMIN_ACTION: "Action administrative",
  SUSPICIOUS_REQUEST: "Requête suspecte",
  UPLOAD_REJECTED: "Fichier/refus de dépôt",
  APPLICATION_ERROR: "Erreur serveur",
  PAYTECH_WEBHOOK_ERROR: "Erreur webhook PayTech",
  PAYTECH_WEBHOOK_REJECTED: "Notification PayTech refusée",
  PAYTECH_WEBHOOK_ACCEPTED: "Notification PayTech acceptée",
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const result: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      result &&
      typeof result === "object" &&
      "message" in result &&
      typeof result.message === "string"
        ? result.message
        : "Impossible de charger les informations de sécurité.";
    throw new Error(message);
  }
  return result as T;
}

function fetchSecurityOverview() {
  return fetchJson<SecurityOverview>("/api/admin/security/overview");
}

function fetchOperations() {
  return fetchJson<Operations>("/api/admin/security/operations");
}

function fetchErrors() {
  return fetchJson<ErrorSummary[]>("/api/admin/security/errors");
}

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Impossible de charger les informations de sécurité.";
}

function eventBadge(severity: string) {
  if (severity === "HIGH" || severity === "MEDIUM")
    return "border-accent/30 bg-accent/10 text-accent";
  return "border-primary/20 bg-primary/10 text-primary";
}

function formatBytes(bytes: string | number | null) {
  const value = typeof bytes === "string" ? Number(bytes) : bytes;
  if (value === null || !Number.isFinite(value)) return "—";
  if (value < 1024) return `${value} o`;
  const units = ["Ko", "Mo", "Go", "To"];
  let size = value / 1024;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(size)} ${units[unitIndex]}`;
}

function summarizeJson(value: unknown) {
  if (!value || typeof value !== "object") return "—";
  return Object.entries(value)
    .map(([key, item]) => `${key}: ${String(item ?? "—")}`)
    .join(" · ");
}

export default function AdminSecurityPage() {
  const [overview, setOverview] = useState<SecurityOverview | null>(null);
  const [operations, setOperations] = useState<Operations | null>(null);
  const [errors, setErrors] = useState<ErrorSummary[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [auditSearch, setAuditSearch] = useState("");
  const [auditAction, setAuditAction] = useState("");
  const [auditFrom, setAuditFrom] = useState("");
  const [auditTo, setAuditTo] = useState("");

  const loadOverview = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      setError("");
      try {
        const auditQuery = new URLSearchParams();
        if (auditSearch.trim()) auditQuery.set("search", auditSearch.trim());
        if (auditAction) auditQuery.set("action", auditAction);
        if (auditFrom)
          auditQuery.set("from", new Date(auditFrom).toISOString());
        if (auditTo) {
          const date = new Date(auditTo);
          date.setHours(23, 59, 59, 999);
          auditQuery.set("to", date.toISOString());
        }
        const [overviewData, operationsData, errorData, auditData] =
          await Promise.all([
            fetchSecurityOverview(),
            fetchOperations(),
            fetchErrors(),
            fetchJson<AuditEntry[]>(
              `/api/admin/security/audit?${auditQuery.toString()}`,
            ),
          ]);
        setOverview(overviewData);
        setOperations(operationsData);
        setErrors(errorData);
        setAudit(auditData);
      } catch (loadError) {
        setError(getErrorMessage(loadError));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [auditAction, auditFrom, auditSearch, auditTo],
  );

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetchSecurityOverview(),
      fetchOperations(),
      fetchErrors(),
      fetchJson<AuditEntry[]>("/api/admin/security/audit"),
    ])
      .then(([overviewData, operationsData, errorData, auditData]) => {
        if (!active) return;
        setOverview(overviewData);
        setOperations(operationsData);
        setErrors(errorData);
        setAudit(auditData);
      })
      .catch((loadError: unknown) => {
        if (active) setError(getErrorMessage(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const cards = overview
    ? [
        {
          label: "Événements · 24 h",
          value: overview.summary.total,
          icon: Activity,
        },
        {
          label: "Échecs de connexion · 24 h",
          value: overview.summary.failedLogins,
          icon: LockKeyhole,
        },
        {
          label: "Accès refusés · 24 h",
          value: overview.summary.denied,
          icon: ShieldAlert,
        },
        {
          label: "Limites déclenchées · 24 h",
          value: overview.summary.rateLimited,
          icon: CircleAlert,
        },
      ]
    : [];

  const exportAudit = () => {
    const columns = [
      "Date",
      "Administrateur",
      "Action",
      "Entité",
      "ID",
      "Avant",
      "Après",
    ];
    const rows = audit.map((entry) => [
      new Date(entry.createdAt).toISOString(),
      entry.actor?.email ?? "Compte supprimé",
      entry.action,
      entry.entity,
      entry.entityId ?? "",
      JSON.stringify(entry.before ?? ""),
      JSON.stringify(entry.after ?? ""),
    ]);
    const content = [columns, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(";"),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", content], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "journal-audit-sunu-tech-hub.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h1 className="font-bricolage text-2xl font-extrabold">Sécurité</h1>
          </div>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Surveillez les connexions, les accès refusés, les limites anti-abus
            et les actions sensibles de l’administration.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void loadOverview(true)}
          disabled={loading || refreshing}
        >
          {refreshing ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Actualiser
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/20 bg-accent/5 p-4 text-sm text-accent"
        >
          <span>{error}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => void loadOverview(true)}
          >
            Réessayer
          </Button>
        </div>
      )}

      {loading && !overview ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border bg-card p-10 text-sm text-muted-foreground">
          <LoaderCircle className="h-5 w-5 animate-spin" />
          Chargement des événements…
        </div>
      ) : overview ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map(({ label, value, icon: Icon }) => (
              <Card key={label}>
                <CardContent className="p-5">
                  <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="font-bricolage text-2xl font-extrabold">
                    {numberFormat.format(value)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="p-5">
              {(overview.suspiciousSources.length > 0 ||
                overview.recentEvents.some(
                  (event) =>
                    event.eventType === "SUSPICIOUS_REQUEST" ||
                    event.eventType === "PAYTECH_WEBHOOK_REJECTED",
                )) && (
                <div
                  role="status"
                  className="mb-5 rounded-xl border border-accent/30 bg-accent/10 p-4 text-sm font-medium text-accent"
                >
                  ! Activité inhabituelle détectée. Vérifiez les requêtes
                  suspectes et les notifications de paiement refusées
                  ci-dessous.
                </div>
              )}
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <ShieldAlert className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="font-bricolage font-bold">
                    Sources à surveiller
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Adresses ayant généré au moins 5 échecs de connexion sur la
                    dernière heure. Ce signal est indicatif, pas une preuve de
                    piratage.
                  </p>
                </div>
              </div>
              {overview.suspiciousSources.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {overview.suspiciousSources.map((source) => (
                    <Badge
                      key={source.sourceIp}
                      className="border-accent/30 bg-accent/10 text-accent"
                    >
                      {source.sourceIp} · {source.attempts} échecs
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  Aucune source n’a atteint ce seuil pendant la dernière heure.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-bricolage font-bold">Activité récente</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Conservation automatique pendant {overview.retentionDays}{" "}
                    jours.
                  </p>
                </div>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5" />
                  Mis à jour{" "}
                  {new Intl.DateTimeFormat("fr-FR", {
                    timeStyle: "short",
                  }).format(new Date(overview.generatedAt))}
                </span>
              </div>
              {overview.recentEvents.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="px-3 py-3 font-medium">Date</th>
                        <th className="px-3 py-3 font-medium">Événement</th>
                        <th className="px-3 py-3 font-medium">Compte visé</th>
                        <th className="px-3 py-3 font-medium">Source</th>
                        <th className="px-3 py-3 font-medium">Motif</th>
                        <th className="px-3 py-3 font-medium">Requête</th>
                        <th className="px-3 py-3 font-medium">Résultat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overview.recentEvents.map((event) => (
                        <tr key={event.id} className="border-b last:border-0">
                          <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                            {new Intl.DateTimeFormat("fr-FR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            }).format(new Date(event.createdAt))}
                          </td>
                          <td className="px-3 py-3">
                            <Badge className={eventBadge(event.severity)}>
                              {eventLabels[event.eventType] ?? event.eventType}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 text-xs">
                            {event.targetAccount ?? "—"}
                          </td>
                          <td className="px-3 py-3 font-mono text-xs">
                            {event.sourceIp ?? "Inconnue"}
                          </td>
                          <td className="px-3 py-3 text-xs">
                            {event.reason ?? "—"}
                          </td>
                          <td className="max-w-[280px] px-3 py-3">
                            <p className="truncate font-mono text-xs">
                              {event.method} {event.path}
                            </p>
                            {event.userAgent && (
                              <p
                                className="mt-1 truncate text-[11px] text-muted-foreground"
                                title={event.userAgent}
                              >
                                {event.userAgent}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-3 text-xs">
                            HTTP {event.statusCode}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                  Aucun événement de sécurité enregistré pour le moment. Les
                  événements commenceront à apparaître après activation de cette
                  page.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h2 className="font-bricolage font-bold">
                Erreurs de l’application
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Erreurs serveur et webhooks PayTech observés sur les 7 derniers
                jours. Le message technique détaillé n’est pas exposé dans le
                tableau de bord.
              </p>
              {errors.length ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[600px] text-left text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="px-3 py-3 font-medium">
                          Dernière occurrence
                        </th>
                        <th className="px-3 py-3 font-medium">Type</th>
                        <th className="px-3 py-3 font-medium">Page/API</th>
                        <th className="px-3 py-3 font-medium">HTTP</th>
                        <th className="px-3 py-3 font-medium">Répétitions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {errors.map((item) => (
                        <tr
                          key={`${item.eventType}:${item.path}:${item.statusCode}`}
                          className="border-b last:border-0"
                        >
                          <td className="whitespace-nowrap px-3 py-3 text-xs">
                            {new Intl.DateTimeFormat("fr-FR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            }).format(new Date(item.lastSeen))}
                          </td>
                          <td className="px-3 py-3">
                            {eventLabels[item.eventType] ?? item.eventType}
                          </td>
                          <td className="px-3 py-3 font-mono text-xs">
                            {item.path}
                          </td>
                          <td className="px-3 py-3">{item.statusCode}</td>
                          <td className="px-3 py-3">{item.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-4 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  Aucune erreur serveur ou notification PayTech refusée dans
                  cette période.
                </p>
              )}
            </CardContent>
          </Card>

          {operations && (
            <div className="grid gap-5 xl:grid-cols-2">
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    <h2 className="font-bricolage font-bold">
                      Base de données
                    </h2>
                    <Badge
                      className={eventBadge(
                        operations.database.status === "OK" ? "INFO" : "MEDIUM",
                      )}
                    >
                      {operations.database.status === "OK"
                        ? "Connexion OK"
                        : "À vérifier"}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Taille totale : {formatBytes(operations.database.sizeBytes)}
                  </p>
                  {operations.database.error && (
                    <p role="alert" className="mt-2 text-sm text-accent">
                      {operations.database.error}
                    </p>
                  )}
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="py-2">Table</th>
                          <th className="py-2">Lignes</th>
                          <th className="py-2">Taille</th>
                        </tr>
                      </thead>
                      <tbody>
                        {operations.database.tables.map((table) => (
                          <tr
                            key={table.name}
                            className="border-b last:border-0"
                          >
                            <td className="py-2">{table.name}</td>
                            <td className="py-2">
                              {numberFormat.format(table.rows)}
                            </td>
                            <td className="py-2">
                              {formatBytes(table.sizeBytes)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground">
                    Dernière migration :{" "}
                    {operations.database.lastMigration
                      ? `${operations.database.lastMigration.name} · ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(operations.database.lastMigration.appliedAt))}`
                      : "non disponible"}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Paiements en attente depuis plus de 30 min :{" "}
                    {operations.stalePendingPayments === null
                      ? "indisponible"
                      : numberFormat.format(operations.stalePendingPayments)}
                  </p>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-5">
                <Card>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2">
                      <Server className="h-5 w-5 text-primary" />
                      <h2 className="font-bricolage font-bold">
                        Santé des services
                      </h2>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <p>
                        Backend{" "}
                        <Badge className={eventBadge("INFO")}>
                          {operations.backend.status}
                        </Badge>
                      </p>
                      <p>
                        Frontend{" "}
                        <Badge className={eventBadge("INFO")}>
                          {operations.frontend.status}
                        </Badge>
                      </p>
                      <p>
                        Base{" "}
                        <Badge
                          className={eventBadge(
                            operations.database.status === "OK"
                              ? "INFO"
                              : "MEDIUM",
                          )}
                        >
                          {operations.database.status}
                        </Badge>
                      </p>
                      <p>
                        PayTech{" "}
                        <Badge
                          className={eventBadge(
                            operations.integrations.paytech.ready
                              ? "INFO"
                              : "MEDIUM",
                          )}
                        >
                          {operations.integrations.paytech.ready
                            ? "Configuré"
                            : "À configurer"}
                        </Badge>
                      </p>
                      <p className="flex items-center gap-1">
                        <Mail className="h-4 w-4" /> E-mail{" "}
                        <Badge
                          className={eventBadge(
                            operations.integrations.email.configured
                              ? "INFO"
                              : "MEDIUM",
                          )}
                        >
                          {operations.integrations.email.configured
                            ? "Configuré"
                            : "Non configuré"}
                        </Badge>
                      </p>
                      <p>
                        SMS{" "}
                        <Badge
                          className={eventBadge(
                            operations.integrations.sms.configured
                              ? "INFO"
                              : "MEDIUM",
                          )}
                        >
                          {operations.integrations.sms.configured
                            ? "Configuré"
                            : "Non configuré"}
                        </Badge>
                      </p>
                    </div>
                    <p className="mt-4 text-xs text-muted-foreground">
                      Démarré depuis{" "}
                      {numberFormat.format(operations.backend.uptimeSeconds)} s
                      · Node {operations.backend.nodeVersion} · mémoire RSS{" "}
                      {formatBytes(operations.backend.memoryBytes.rss)} · heap{" "}
                      {formatBytes(operations.backend.memoryBytes.heapUsed)}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Clés PayTech et SMTP : seuls leurs états de configuration
                      sont affichés, jamais leurs valeurs.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-5">
                    <h2 className="font-bricolage font-bold">Sauvegardes</h2>
                    <Badge className="mt-3 border-accent/30 bg-accent/10 text-accent">
                      {operations.backups.status === "NOT_CONFIGURED"
                        ? "Non configurées"
                        : operations.backups.status}
                    </Badge>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {operations.backups.message}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Configurez d’abord un stockage protégé et testez la
                      restauration avant d’ajouter une commande de sauvegarde.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          <Card>
            <CardContent className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-bricolage font-bold">Journal d’audit</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Historique en lecture seule des changements de tarifs,
                    retraits d’attestation et renvois de reçus.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportAudit}
                  disabled={!audit.length}
                >
                  <Download className="h-4 w-4" /> Exporter CSV
                </Button>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_auto_auto_auto]">
                <input
                  value={auditSearch}
                  onChange={(event) => setAuditSearch(event.target.value)}
                  placeholder="Rechercher un administrateur ou une action"
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                />
                <select
                  aria-label="Filtrer par action"
                  value={auditAction}
                  onChange={(event) => setAuditAction(event.target.value)}
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                >
                  <option value="">Toutes les actions</option>
                  <option value="PRICING_UPDATED">Tarif modifié</option>
                  <option value="ATTESTATION_REVOKED">
                    Attestation retirée
                  </option>
                  <option value="RECEIPTS_RESEND_QUEUED">Reçus renvoyés</option>
                  <option value="PROJECT_REVIEWED">Projet évalué</option>
                </select>
                <input
                  aria-label="Date de début audit"
                  type="date"
                  value={auditFrom}
                  onChange={(event) => setAuditFrom(event.target.value)}
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                />
                <input
                  aria-label="Date de fin audit"
                  type="date"
                  value={auditTo}
                  onChange={(event) => setAuditTo(event.target.value)}
                  className="h-10 rounded-xl border border-input bg-background px-3 text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void loadOverview(true)}
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Filtrer
                </Button>
              </div>
              {audit.length ? (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-[800px] text-left text-sm">
                    <thead>
                      <tr className="border-b text-xs text-muted-foreground">
                        <th className="px-3 py-3">Date</th>
                        <th className="px-3 py-3">Personne</th>
                        <th className="px-3 py-3">Action</th>
                        <th className="px-3 py-3">Élément</th>
                        <th className="px-3 py-3">Avant</th>
                        <th className="px-3 py-3">Après</th>
                      </tr>
                    </thead>
                    <tbody>
                      {audit.map((entry) => (
                        <tr key={entry.id} className="border-b last:border-0">
                          <td className="whitespace-nowrap px-3 py-3 text-xs">
                            {new Intl.DateTimeFormat("fr-FR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            }).format(new Date(entry.createdAt))}
                          </td>
                          <td className="px-3 py-3">
                            {entry.actor?.name ?? "Compte supprimé"}
                          </td>
                          <td className="px-3 py-3">{entry.action}</td>
                          <td className="px-3 py-3">
                            {entry.entity}
                            {entry.entityId ? ` · ${entry.entityId}` : ""}
                          </td>
                          <td className="max-w-56 px-3 py-3 text-xs text-muted-foreground">
                            {summarizeJson(entry.before)}
                          </td>
                          <td className="max-w-56 px-3 py-3 text-xs text-muted-foreground">
                            {summarizeJson(entry.after)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-4 rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                  Aucun changement audité pour ces filtres. Les événements
                  antérieurs à l’activation de l’audit ne peuvent pas être
                  reconstruits.
                </p>
              )}
            </CardContent>
          </Card>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Le journal détecte des signaux observés par l’application, pas
            toutes les intrusions. Les sessions actives, la révocation de
            session, le MFA, le blocage manuel d’IP, les requêtes lentes et les
            sauvegardes ne sont pas configurés dans cette livraison. Les
            fichiers de dépôt sont des liens, aucun upload n’est actuellement
            accepté.
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Cette page détecte des comportements suspects à partir des
            événements observés par l’application. Elle ne garantit pas la
            détection de toute intrusion et ne remplace ni la surveillance de
            l’hébergeur ni des sauvegardes régulières.
          </p>
        </>
      ) : null}
    </div>
  );
}
