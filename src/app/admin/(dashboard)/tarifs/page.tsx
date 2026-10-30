"use client";

import { useCallback, useEffect, useState } from "react";
import type { Metadata } from "next";
import { Check, CircleAlert, LoaderCircle, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { usePagination } from "@/hooks/use-pagination";

type PriceKey =
  | "prix_cours_base"
  | "prix_cours_avance"
  | "prix_passage_avance"
  | "prix_attestation"
  | "duree_acces_jours"
  | "prix_atelier"
  | "prix_offre_emploi"
  | "prix_sponsoring_trimestre"
  | "delai_rappel_fin_acces_jours"
  | "frais_paiement_pourcentage";

type Pricing = Record<PriceKey, number> & { devise: string };
type PriceRecord = { key: string; value: string; updatedAt: string };
type PriceHistory = {
  id: string;
  key: string;
  oldValue: string | null;
  newValue: string;
  changedAt: string;
  user: { name: string };
};
type AdminPriceResponse = {
  pricing: PriceRecord[];
  history: PriceHistory[];
};
type Course = {
  id: string;
  title: string;
  isFree: boolean;
  basePrice: number | null;
  advancedPrice: number | null;
  upgradePrice: number | null;
  attestationPrice: number | null;
  prices: { base: number; advanced: number; upgrade: number; attestation: number };
};
type Promotion = {
  id: string;
  code: string;
  type: "FIXED" | "PERCENTAGE";
  value: number;
  startsAt: string;
  expiresAt: string;
  usageLimit: number | null;
  usedCount: number;
  active: boolean;
};

const fields: Array<{ key: PriceKey; label: string; unit: string }> = [
  { key: "prix_cours_base", label: "Cours — version de base", unit: "FCFA" },
  { key: "prix_cours_avance", label: "Cours — version avancée", unit: "FCFA" },
  {
    key: "prix_passage_avance",
    label: "Passage de base à avancée",
    unit: "FCFA",
  },
  { key: "prix_attestation", label: "Attestation de réussite", unit: "FCFA" },
  { key: "duree_acces_jours", label: "Durée d’accès", unit: "jours" },
  { key: "prix_atelier", label: "Atelier — par participant", unit: "FCFA" },
  { key: "prix_offre_emploi", label: "Publication d’une offre", unit: "FCFA" },
  {
    key: "prix_sponsoring_trimestre",
    label: "Sponsoring — par trimestre",
    unit: "FCFA",
  },
  {
    key: "delai_rappel_fin_acces_jours",
    label: "Rappel avant la fin d’accès",
    unit: "jours",
  },
  {
    key: "frais_paiement_pourcentage",
    label: "Frais de paiement estimés",
    unit: "%",
  },
];

const numberFormat = new Intl.NumberFormat("fr-FR");

function formatPrice(value: number | null) {
  return value === null ? "Par défaut" : `${numberFormat.format(value)} FCFA`;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/admin/${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
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
        : "La requête n’a pas abouti.";
    throw new Error(message);
  }
  return result as T;
}

export default function AdminTarifsPage() {
  const [values, setValues] = useState<Pricing | null>(null);
  const [draft, setDraft] = useState<Record<PriceKey, string> | null>(null);
  const [history, setHistory] = useState<PriceHistory[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [promotionSaving, setPromotionSaving] = useState(false);
  const [promotion, setPromotion] = useState({
    code: "",
    type: "PERCENTAGE" as Promotion["type"],
    value: "",
    startsAt: "",
    expiresAt: "",
    usageLimit: "",
  });
  const coursesPagination = usePagination(courses);
  const promotionsPagination = usePagination(promotions);
  const historyPagination = usePagination(history);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [priceData, courseData, promotionData] = await Promise.all([
        api<AdminPriceResponse>("pricing"),
        fetch("/api/courses", { cache: "no-store" }).then(async (response) => {
          if (!response.ok) throw new Error("Impossible de charger les cours.");
          return (await response.json()) as Course[];
        }),
        api<Promotion[]>("promotions"),
      ]);
      const byKey = Object.fromEntries(
        priceData.pricing.map((item) => [item.key, item.value]),
      );
      const current: Pricing = {
        prix_cours_base: Number(byKey.prix_cours_base),
        prix_cours_avance: Number(byKey.prix_cours_avance),
        prix_passage_avance: Number(byKey.prix_passage_avance),
        prix_attestation: Number(byKey.prix_attestation),
        duree_acces_jours: Number(byKey.duree_acces_jours),
        prix_atelier: Number(byKey.prix_atelier),
        prix_offre_emploi: Number(byKey.prix_offre_emploi),
        prix_sponsoring_trimestre: Number(byKey.prix_sponsoring_trimestre),
        delai_rappel_fin_acces_jours: Number(
          byKey.delai_rappel_fin_acces_jours,
        ),
        frais_paiement_pourcentage: Number(
          byKey.frais_paiement_pourcentage,
        ),
        devise: byKey.devise ?? "FCFA",
      };
      setValues(current);
      setDraft({
        prix_cours_base: String(current.prix_cours_base),
        prix_cours_avance: String(current.prix_cours_avance),
        prix_passage_avance: String(current.prix_passage_avance),
        prix_attestation: String(current.prix_attestation),
        duree_acces_jours: String(current.duree_acces_jours),
        prix_atelier: String(current.prix_atelier),
        prix_offre_emploi: String(current.prix_offre_emploi),
        prix_sponsoring_trimestre: String(current.prix_sponsoring_trimestre),
        delai_rappel_fin_acces_jours: String(
          current.delai_rappel_fin_acces_jours,
        ),
        frais_paiement_pourcentage: String(
          current.frais_paiement_pourcentage,
        ),
      });
      setHistory(priceData.history);
      setCourses(courseData);
      setPromotions(promotionData);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Impossible de charger les tarifs.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const savePrices = async () => {
    if (!draft) return;
    const next = Object.fromEntries(
      fields.map(({ key }) => [key, Number(draft[key])]),
    ) as Record<PriceKey, number>;
    if (
      fields.some(
        ({ key }) =>
          !Number.isSafeInteger(next[key]) ||
          next[key] <
            (key === "duree_acces_jours" ||
            key === "delai_rappel_fin_acces_jours"
              ? 1
              : 0) ||
          (key === "frais_paiement_pourcentage" && next[key] > 100),
      )
    ) {
      setError("Saisis des nombres entiers valides pour chaque paramètre.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    try {
      await api<AdminPriceResponse>("pricing", {
        method: "PATCH",
        body: JSON.stringify(next),
      });
      setNotice("Les paramètres de tarification ont été enregistrés.");
      await loadData();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Impossible d’enregistrer les tarifs.",
      );
    } finally {
      setSaving(false);
    }
  };

  const saveCourse = async (course: Course, data: FormData) => {
    const optionalPrice = (key: string) => {
      const value = String(data.get(key) ?? "").trim();
      if (!value) return null;
      const number = Number(value);
      if (!Number.isSafeInteger(number) || number < 0) {
        throw new Error("Saisis un montant entier positif ou laisse le champ vide.");
      }
      return number;
    };

    setError("");
    setNotice("");
    const button = data.get("isFree");
    const body = {
      isFree: button === "on",
      basePrice: optionalPrice("basePrice"),
      advancedPrice: optionalPrice("advancedPrice"),
      upgradePrice: optionalPrice("upgradePrice"),
      attestationPrice: optionalPrice("attestationPrice"),
    };
    try {
      await api<Course>(`courses/${encodeURIComponent(course.id)}/prices`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setNotice(`Les prix de « ${course.title} » ont été enregistrés.`);
      await loadData();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Impossible d’enregistrer les prix du cours.",
      );
    }
  };

  const createPromotion = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(promotion.value);
    if (!Number.isSafeInteger(value) || value < 1) {
      setError("Saisis une valeur de promotion entière supérieure à zéro.");
      return;
    }
    if (promotion.type === "PERCENTAGE" && value > 100) {
      setError("Une réduction en pourcentage ne peut pas dépasser 100 %.");
      return;
    }
    if (!promotion.expiresAt) {
      setError("Saisis une date de fin pour le code promotionnel.");
      return;
    }
    setPromotionSaving(true);
    setError("");
    setNotice("");
    try {
      await api<Promotion>("promotions", {
        method: "POST",
        body: JSON.stringify({
          code: promotion.code.trim().toUpperCase(),
          type: promotion.type,
          value,
          ...(promotion.startsAt
            ? { startsAt: new Date(promotion.startsAt).toISOString() }
            : {}),
          expiresAt: new Date(promotion.expiresAt).toISOString(),
          ...(promotion.usageLimit
            ? { usageLimit: Number(promotion.usageLimit) }
            : {}),
        }),
      });
      setPromotion({
        code: "",
        type: "PERCENTAGE",
        value: "",
        startsAt: "",
        expiresAt: "",
        usageLimit: "",
      });
      setNotice("Le code promotionnel a été créé.");
      await loadData();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Impossible de créer le code promotionnel.",
      );
    } finally {
      setPromotionSaving(false);
    }
  };

  const togglePromotion = async (item: Promotion) => {
    setError("");
    setNotice("");
    try {
      await api<Promotion>(
        `promotions/${encodeURIComponent(item.id)}/active/${!item.active}`,
        { method: "PATCH" },
      );
      setNotice(`Le code ${item.code} a été mis à jour.`);
      await loadData();
    } catch (toggleError) {
      setError(
        toggleError instanceof Error
          ? toggleError.message
          : "Impossible de mettre à jour le code.",
      );
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-accent/20 bg-accent/10 p-4 text-sm text-accent"
        >
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary"
        >
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          {notice}
        </p>
      )}

      <Card>
        <CardContent className="flex flex-col gap-5 p-5 sm:p-6">
          <div>
            <h2 className="font-bricolage text-lg font-bold">
              Paramètres de tarification
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ces valeurs sont conservées en base. Les paiements passés ne sont
              pas modifiés.
            </p>
          </div>
          {loading || !draft ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Chargement des paramètres…
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {fields.map(({ key, label, unit }) => (
                  <label key={key} className="flex flex-col gap-1.5 text-sm">
                    <span className="font-semibold">{label}</span>
                    <span className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={key === "duree_acces_jours" ? 1 : 0}
                        step="1"
                        value={draft[key]}
                        onChange={(event) =>
                          setDraft({ ...draft, [key]: event.target.value })
                        }
                        className="rounded-xl"
                      />
                      <span className="w-14 text-xs text-muted-foreground">
                        {unit}
                      </span>
                    </span>
                  </label>
                ))}
                <div className="flex flex-col gap-1.5 text-sm">
                  <span className="font-semibold">Devise</span>
                  <Input value={values?.devise ?? "FCFA"} readOnly className="rounded-xl" />
                </div>
              </div>
              {values && (
                <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
                  <p className="text-sm font-semibold text-primary">
                    Aperçu sur la page du cours
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    S’inscrire — {numberFormat.format(Number(draft.prix_cours_base) || 0)} FCFA ·
                    Version avancée — {numberFormat.format(Number(draft.prix_cours_avance) || 0)} FCFA
                  </p>
                </div>
              )}
              <Button
                onClick={savePrices}
                disabled={saving}
                className="w-full gap-2 sm:w-fit"
              >
                {saving ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Enregistrer
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-5 p-5 sm:p-6">
          <div>
            <h2 className="font-bricolage text-lg font-bold">Prix par cours</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Laisse un prix vide pour utiliser le paramètre par défaut.
            </p>
          </div>
          {courses.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground">
              Aucun cours disponible pour le moment.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {coursesPagination.pageItems.map((course) => (
                <form
                  key={course.id}
                  action={(data) => saveCourse(course, data)}
                  className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-5"
                >
                  <div className="sm:col-span-2 lg:col-span-5">
                    <p className="font-semibold">{course.title}</p>
                  </div>
                  {[
                    ["basePrice", "Base", course.basePrice],
                    ["advancedPrice", "Avancée", course.advancedPrice],
                    ["upgradePrice", "Passage", course.upgradePrice],
                    ["attestationPrice", "Attestation", course.attestationPrice],
                  ].map(([key, label, value]) => (
                    <label key={String(key)} className="flex flex-col gap-1 text-xs">
                      <span className="font-semibold">{String(label)}</span>
                      <Input
                        name={String(key)}
                        type="number"
                        min="0"
                        step="1"
                        defaultValue={value === null ? "" : String(value)}
                        placeholder={formatPrice(
                          course.prices[
                            key === "basePrice"
                              ? "base"
                              : key === "advancedPrice"
                                ? "advanced"
                                : key === "upgradePrice"
                                  ? "upgrade"
                                  : "attestation"
                          ],
                        )}
                        className="h-10 rounded-lg"
                      />
                    </label>
                  ))}
                  <PaginationControls
                    page={coursesPagination.page}
                    pageSize={coursesPagination.pageSize}
                    totalItems={coursesPagination.totalItems}
                    totalPages={coursesPagination.totalPages}
                    onPageChange={coursesPagination.setPage}
                    onPageSizeChange={coursesPagination.setPageSize}
                  />
                  <label className="flex items-center gap-2 text-sm sm:col-span-2 lg:col-span-4">
                    <input
                      name="isFree"
                      type="checkbox"
                      defaultChecked={course.isFree}
                      className="h-4 w-4 accent-primary"
                    />
                    Cours gratuit
                  </label>
                  <Button type="submit" variant="outline" size="sm" className="gap-2">
                    <Save className="h-3.5 w-3.5" />
                    Enregistrer
                  </Button>
                </form>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-5 p-5 sm:p-6">
          <div>
            <h2 className="font-bricolage text-lg font-bold">Codes promotionnels</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Crée des codes à montant fixe ou en pourcentage avec une date de fin.
            </p>
          </div>
          <form onSubmit={createPromotion} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold">Code</span>
              <Input
                required
                minLength={3}
                maxLength={32}
                pattern="[A-Za-z0-9_-]+"
                value={promotion.code}
                onChange={(event) =>
                  setPromotion({ ...promotion, code: event.target.value.toUpperCase() })
                }
                className="rounded-xl uppercase"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold">Type</span>
              <select
                value={promotion.type}
                onChange={(event) =>
                  setPromotion({
                    ...promotion,
                    type: event.target.value as Promotion["type"],
                  })
                }
                className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
              >
                <option value="PERCENTAGE">Pourcentage</option>
                <option value="FIXED">Montant fixe (FCFA)</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold">
                Valeur {promotion.type === "PERCENTAGE" ? "(%)" : "(FCFA)"}
              </span>
              <Input
                required
                min="1"
                step="1"
                type="number"
                value={promotion.value}
                onChange={(event) =>
                  setPromotion({ ...promotion, value: event.target.value })
                }
                className="rounded-xl"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold">Début (facultatif)</span>
              <Input
                type="datetime-local"
                value={promotion.startsAt}
                onChange={(event) =>
                  setPromotion({ ...promotion, startsAt: event.target.value })
                }
                className="rounded-xl"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold">Date de fin</span>
              <Input
                required
                type="datetime-local"
                value={promotion.expiresAt}
                onChange={(event) =>
                  setPromotion({ ...promotion, expiresAt: event.target.value })
                }
                className="rounded-xl"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-semibold">Utilisations maximum</span>
              <Input
                min="1"
                step="1"
                type="number"
                value={promotion.usageLimit}
                onChange={(event) =>
                  setPromotion({ ...promotion, usageLimit: event.target.value })
                }
                placeholder="Sans limite"
                className="rounded-xl"
              />
            </label>
            <Button
              type="submit"
              disabled={promotionSaving}
              className="gap-2 sm:col-span-2 lg:col-span-3 lg:w-fit"
            >
              {promotionSaving ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Créer le code
            </Button>
          </form>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="p-3">Code</th>
                  <th className="p-3">Réduction</th>
                  <th className="p-3">Fin</th>
                  <th className="p-3">Utilisations</th>
                  <th className="p-3">État</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {promotionsPagination.pageItems.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="p-3 font-semibold">{item.code}</td>
                    <td className="p-3">
                      {item.type === "PERCENTAGE"
                        ? `${item.value} %`
                        : `${numberFormat.format(item.value)} FCFA`}
                    </td>
                    <td className="p-3">
                      {new Intl.DateTimeFormat("fr-FR").format(new Date(item.expiresAt))}
                    </td>
                    <td className="p-3">
                      {item.usedCount} / {item.usageLimit ?? "∞"}
                    </td>
                    <td className="p-3">{item.active ? "Actif" : "Inactif"}</td>
                    <td className="p-3 text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => togglePromotion(item)}
                      >
                        {item.active ? "Désactiver" : "Activer"}
                      </Button>
                    </td>
                  </tr>
                ))}
                {promotions.length === 0 && (
                  <tr>
                    <td className="p-4 text-center text-muted-foreground" colSpan={6}>
                      Aucun code promotionnel.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={promotionsPagination.page}
            pageSize={promotionsPagination.pageSize}
            totalItems={promotionsPagination.totalItems}
            totalPages={promotionsPagination.totalPages}
            onPageChange={promotionsPagination.setPage}
            onPageSizeChange={promotionsPagination.setPageSize}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:p-6">
          <div>
            <h2 className="font-bricolage text-lg font-bold">Historique des changements</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Journal en lecture seule des modifications de prix par défaut.
            </p>
          </div>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <th className="p-3">Date</th>
                  <th className="p-3">Paramètre</th>
                  <th className="p-3">Ancienne valeur</th>
                  <th className="p-3">Nouvelle valeur</th>
                  <th className="p-3">Modifié par</th>
                </tr>
              </thead>
              <tbody>
                {historyPagination.pageItems.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="whitespace-nowrap p-3">
                      {new Intl.DateTimeFormat("fr-FR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(item.changedAt))}
                    </td>
                    <td className="p-3">{item.key}</td>
                    <td className="p-3">{item.oldValue ?? "—"}</td>
                    <td className="p-3 font-medium">{item.newValue}</td>
                    <td className="p-3">{item.user.name}</td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td className="p-4 text-center text-muted-foreground" colSpan={5}>
                      Aucun changement enregistré.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <PaginationControls
            page={historyPagination.page}
            pageSize={historyPagination.pageSize}
            totalItems={historyPagination.totalItems}
            totalPages={historyPagination.totalPages}
            onPageChange={historyPagination.setPage}
            onPageSizeChange={historyPagination.setPageSize}
          />
        </CardContent>
      </Card>
    </div>
  );
}
