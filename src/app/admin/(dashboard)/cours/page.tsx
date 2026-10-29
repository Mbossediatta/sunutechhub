"use client";

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { BadgeDollarSign, BookOpen, LoaderCircle, Pencil, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CourseContentManager } from "@/components/admin/course-content-manager";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { usePagination } from "@/hooks/use-pagination";

type AdminCourse = {
  id: string;
  title: string;
  description: string;
  level: string;
  language: string;
  instructorName: string;
  duration: string;
  coverImageUrl: string | null;
  lessons: number;
  subjects: string[];
  active: boolean;
  isFree: boolean;
  basePrice: number | null;
  advancedPrice: number | null;
  upgradePrice: number | null;
  attestationPrice: number | null;
  _count: { registrations: number };
  prices: {
    base: number;
    advanced: number;
    upgrade: number;
    attestation: number;
    accessDays: number;
    currency: string;
  };
};

type CourseForm = {
  title: string;
  description: string;
  level: string;
  language: string;
  instructorName: string;
  duration: string;
  coverImageUrl: string;
  lessons: string;
  subjects: string;
  isFree: boolean;
  active: boolean;
  basePrice: string;
  advancedPrice: string;
  upgradePrice: string;
  attestationPrice: string;
};

const emptyForm: CourseForm = {
  title: "",
  description: "",
  level: "Débutant",
  language: "Français",
  instructorName: "Sunu Tech Hub",
  duration: "",
  coverImageUrl: "",
  lessons: "0",
  subjects: "",
  isFree: false,
  active: true,
  basePrice: "",
  advancedPrice: "",
  upgradePrice: "",
  attestationPrice: "",
};

const numberFormat = new Intl.NumberFormat("fr-FR");

function toForm(course: AdminCourse): CourseForm {
  return {
    title: course.title,
    description: course.description,
    level: course.level,
    language: course.language,
    instructorName: course.instructorName,
    duration: course.duration,
    coverImageUrl: course.coverImageUrl ?? "",
    lessons: String(course.lessons),
    subjects: course.subjects.join(", "),
    isFree: course.isFree,
    active: course.active,
    basePrice: course.basePrice === null ? "" : String(course.basePrice),
    advancedPrice: course.advancedPrice === null ? "" : String(course.advancedPrice),
    upgradePrice: course.upgradePrice === null ? "" : String(course.upgradePrice),
    attestationPrice: course.attestationPrice === null ? "" : String(course.attestationPrice),
  };
}

function formatPrice(value: number, currency: string) {
  return `${numberFormat.format(value)} ${currency}`;
}

function parsePrice(value: string) {
  return value.trim() === "" ? null : Number(value);
}

export default function AdminCoursPage() {
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [contentCourse, setContentCourse] = useState<AdminCourse | null>(null);
  const [form, setForm] = useState<CourseForm>(emptyForm);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState("");
  const bannerPreviewRef = useRef("");
  const [editing, setEditing] = useState<AdminCourse | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const pagination = usePagination(courses);

  useEffect(() => {
    return () => {
      if (bannerPreviewRef.current) {
        URL.revokeObjectURL(bannerPreviewRef.current);
      }
    };
  }, []);

  const selectBannerFile = (file: File | null) => {
    if (bannerPreviewRef.current) {
      URL.revokeObjectURL(bannerPreviewRef.current);
    }
    const previewUrl = file ? URL.createObjectURL(file) : "";
    bannerPreviewRef.current = previewUrl;
    setBannerPreviewUrl(previewUrl);
    setBannerFile(file);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/courses", { cache: "no-store" });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          result && typeof result === "object" && "message" in result && typeof result.message === "string"
            ? result.message
            : "Impossible de charger les cours.";
        throw new Error(message);
      }
      if (!Array.isArray(result)) throw new Error("Réponse des cours invalide.");
      setCourses(result as AdminCourse[]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Impossible de charger les cours.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const beginCreate = () => {
    setEditing(null);
    setCreating(true);
    setContentCourse(null);
    setForm(emptyForm);
    selectBannerFile(null);
    setError("");
    setNotice("");
  };

  const beginEdit = (course: AdminCourse) => {
    setEditing(course);
    setCreating(false);
    setForm(toForm(course));
    selectBannerFile(null);
    setError("");
    setNotice("");
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    const lessons = Number(form.lessons);
    const prices = {
      basePrice: parsePrice(form.basePrice),
      advancedPrice: parsePrice(form.advancedPrice),
      upgradePrice: parsePrice(form.upgradePrice),
      attestationPrice: parsePrice(form.attestationPrice),
    };
    if (!Number.isSafeInteger(lessons) || lessons < 0) {
      setError("Le nombre de leçons doit être un entier positif.");
      return;
    }
    if (Object.values(prices).some((value) => value !== null && (!Number.isSafeInteger(value) || value < 0))) {
      setError("Les prix doivent être des montants entiers positifs ou laissés vides.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    let uploadedBannerPath: string | null = null;
    let courseSaved = false;
    try {
      let coverImageUrl: string | null = form.coverImageUrl.trim() || null;
      if (bannerFile) {
        const uploadResponse = await fetch("/api/admin/courses/banner/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: bannerFile.name,
            size: bannerFile.size,
            contentType: bannerFile.type,
          }),
        });
        const uploadResult: unknown = await uploadResponse.json().catch(() => null);
        if (
          !uploadResponse.ok ||
          !uploadResult ||
          typeof uploadResult !== "object" ||
          !("path" in uploadResult) ||
          typeof uploadResult.path !== "string" ||
          !("signedUrl" in uploadResult) ||
          typeof uploadResult.signedUrl !== "string"
        ) {
          const message =
            uploadResult &&
            typeof uploadResult === "object" &&
            "message" in uploadResult &&
            typeof uploadResult.message === "string"
              ? uploadResult.message
              : "Impossible de préparer le téléversement de la bannière.";
          throw new Error(message);
        }
        uploadedBannerPath = uploadResult.path;
        const storageResponse = await fetch(uploadResult.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": bannerFile.type },
          body: bannerFile,
          credentials: "omit",
        });
        if (!storageResponse.ok) {
          throw new Error("Le téléversement de la bannière a échoué.");
        }

        const verifyResponse = await fetch(
          "/api/admin/courses/banner/verify-upload",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              path: uploadResult.path,
              size: bannerFile.size,
              contentType: bannerFile.type,
            }),
          },
        );
        const verifyResult: unknown = await verifyResponse.json().catch(() => null);
        if (
          !verifyResponse.ok ||
          !verifyResult ||
          typeof verifyResult !== "object" ||
          !("coverImageUrl" in verifyResult) ||
          typeof verifyResult.coverImageUrl !== "string"
        ) {
          const message =
            verifyResult &&
            typeof verifyResult === "object" &&
            "message" in verifyResult &&
            typeof verifyResult.message === "string"
              ? verifyResult.message
              : "Impossible de vérifier la bannière téléversée.";
          throw new Error(message);
        }
        coverImageUrl = verifyResult.coverImageUrl;
      }

      const general = {
        title: form.title,
        description: form.description,
        level: form.level,
        language: form.language,
        instructorName: form.instructorName,
        duration: form.duration,
        coverImageUrl,
        lessons,
        subjects: form.subjects.split(",").map((subject) => subject.trim()).filter(Boolean),
        isFree: form.isFree,
        active: form.active,
      };
      const endpoint = editing
        ? `/api/admin/courses/${encodeURIComponent(editing.id)}`
        : "/api/admin/courses";
      const response = await fetch(endpoint, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(general),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          result && typeof result === "object" && "message" in result && typeof result.message === "string"
            ? result.message
            : "Impossible d’enregistrer le cours.";
        throw new Error(message);
      }

      const courseId =
        result && typeof result === "object" && "id" in result && typeof result.id === "string"
          ? result.id
          : null;
      if (!courseId) throw new Error("Le cours a été enregistré, mais sa réponse est invalide.");

      courseSaved = true;

      const priceResponse = await fetch(`/api/admin/courses/${encodeURIComponent(courseId)}/prices`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFree: form.isFree, ...prices }),
      });
      const priceResult: unknown = await priceResponse.json().catch(() => null);
      if (!priceResponse.ok) {
        const message =
          priceResult && typeof priceResult === "object" && "message" in priceResult && typeof priceResult.message === "string"
            ? priceResult.message
            : "Le cours est enregistré, mais ses tarifs n’ont pas pu être sauvegardés.";
        throw new Error(message);
      }

      setEditing(null);
      setCreating(false);
      setForm(emptyForm);
      selectBannerFile(null);
      setNotice(editing ? "Le cours a été modifié." : "Le cours a été créé.");
      await load();
    } catch (saveError) {
      let message =
        saveError instanceof Error
          ? saveError.message
          : "Impossible d’enregistrer le cours.";
      if (uploadedBannerPath && !courseSaved) {
        try {
          const cleanupResponse = await fetch("/api/admin/courses/banner/upload", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: uploadedBannerPath }),
          });
          if (!cleanupResponse.ok) {
            message += " Le fichier temporaire n’a pas pu être supprimé.";
          }
        } catch {
          message += " Le fichier temporaire n’a pas pu être supprimé.";
        }
      }
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {error && <p role="alert" className="rounded-xl border border-accent/20 bg-accent/10 p-4 text-sm text-accent">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary">{notice}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: "Cours enregistrés", value: loading ? "…" : courses.length },
          { label: "Cours actifs", value: loading ? "…" : courses.filter((course) => course.active).length },
          { label: "Inscriptions", value: loading ? "…" : courses.reduce((sum, course) => sum + course._count.registrations, 0) },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border bg-card p-4 text-center">
            <p className="font-bricolage text-2xl font-extrabold text-primary">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {!editing && !creating && courses.length > 0 && (
        <Button onClick={beginCreate} className="w-fit">
          <Plus className="h-4 w-4" /> Ajouter un cours
        </Button>
      )}
      {(editing || creating || (!courses.length && !loading)) && (
        <form onSubmit={save} className="grid gap-3 rounded-2xl border bg-card p-5 sm:grid-cols-2">
          <div className="flex items-center justify-between sm:col-span-2">
            <h2 className="font-bricolage text-lg font-bold">{editing ? "Modifier le cours" : "Créer un cours"}</h2>
            {(editing || creating) && <Button type="button" variant="ghost" size="sm" onClick={() => { setEditing(null); setCreating(false); selectBannerFile(null); }}><X className="h-4 w-4" /> Fermer</Button>}
          </div>
          <Input required minLength={3} maxLength={180} placeholder="Titre du cours" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          <Input maxLength={100} placeholder="Langue" value={form.language} onChange={(event) => setForm({ ...form, language: event.target.value })} />
          <Input maxLength={80} placeholder="Niveau" value={form.level} onChange={(event) => setForm({ ...form, level: event.target.value })} />
          <Input maxLength={180} placeholder="Formateur" value={form.instructorName} onChange={(event) => setForm({ ...form, instructorName: event.target.value })} />
          <Input maxLength={80} placeholder="Durée (ex. 8 heures)" value={form.duration} onChange={(event) => setForm({ ...form, duration: event.target.value })} />
          <label className="flex flex-col gap-1.5 text-sm sm:col-span-2">
            Photo de bannière du cours (facultative)
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={saving}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                if (
                  file &&
                  (!["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
                    file.size > 5 * 1024 * 1024)
                ) {
                  setError("Choisis une image JPG, PNG ou WebP de 5 Mo maximum.");
                  event.target.value = "";
                  return;
                }
                setError("");
                selectBannerFile(file);
                if (file) setForm((current) => ({ ...current, coverImageUrl: "" }));
              }}
            />
            <span className="text-xs text-muted-foreground">
              Choisis une image JPG, PNG ou WebP de 5 Mo maximum, ou indique un
              lien HTTPS. Ce champ peut rester vide.
            </span>
            <Input
              type="url"
              maxLength={2048}
              placeholder="https://exemple.com/image.jpg"
              value={form.coverImageUrl}
              disabled={Boolean(bannerFile) || saving}
              onChange={(event) => setForm({ ...form, coverImageUrl: event.target.value })}
            />
          </label>
          {(bannerPreviewUrl || form.coverImageUrl.trim()) && (
            <img
              src={bannerPreviewUrl || form.coverImageUrl.trim()}
              alt="Aperçu de la couverture du cours"
              className="max-h-48 w-full rounded-xl border object-cover sm:col-span-2"
            />
          )}
          <Input required type="number" min={0} step={1} placeholder="Nombre de leçons" value={form.lessons} onChange={(event) => setForm({ ...form, lessons: event.target.value })} />
          <Input placeholder="Sujets séparés par des virgules" value={form.subjects} onChange={(event) => setForm({ ...form, subjects: event.target.value })} className="sm:col-span-2" />
          <textarea required minLength={10} maxLength={5000} rows={4} placeholder="Description du cours" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="rounded-xl border border-input bg-background px-4 py-3 text-sm sm:col-span-2" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isFree} onChange={(event) => setForm({ ...form, isFree: event.target.checked })} /> Cours gratuit</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> Cours visible et actif</label>
          <p className="text-sm font-semibold sm:col-span-2">Prix propres à ce cours (laisser vide pour utiliser les tarifs par défaut)</p>
          <Input type="number" min={0} step={1} placeholder="Version de base — FCFA" value={form.basePrice} onChange={(event) => setForm({ ...form, basePrice: event.target.value })} />
          <Input type="number" min={0} step={1} placeholder="Version avancée — FCFA" value={form.advancedPrice} onChange={(event) => setForm({ ...form, advancedPrice: event.target.value })} />
          <Input type="number" min={0} step={1} placeholder="Passage avancé — FCFA" value={form.upgradePrice} onChange={(event) => setForm({ ...form, upgradePrice: event.target.value })} />
          <Input type="number" min={0} step={1} placeholder="Attestation — FCFA" value={form.attestationPrice} onChange={(event) => setForm({ ...form, attestationPrice: event.target.value })} />
          <Button type="submit" disabled={saving} className="sm:col-span-2 sm:justify-self-start">
            {saving && <LoaderCircle className="h-4 w-4 animate-spin" />}
            {editing ? "Enregistrer les modifications" : "Créer le cours"}
          </Button>
        </form>
      )}

      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr><th className="p-3">Cours</th><th className="p-3">Niveau / langue</th><th className="p-3">Inscrits</th><th className="p-3">Tarifs</th><th className="p-3">État / actions</th></tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-8 text-center text-muted-foreground"><LoaderCircle className="mx-auto h-5 w-5 animate-spin" /><span className="mt-2 block">Chargement des cours…</span></td></tr>
            ) : courses.length ? pagination.pageItems.map((course) => (
              <tr key={course.id} className="border-t">
                <td className="p-3"><span className="flex items-center gap-2 font-medium">{course.coverImageUrl ? <img src={course.coverImageUrl} alt="" className="h-10 w-14 rounded-md object-cover" /> : <BookOpen className="h-4 w-4 shrink-0 text-primary" />}{course.title}</span><span className="ml-6 text-xs text-muted-foreground">{course.lessons} leçons · {course.duration || "Durée non précisée"}</span></td>
                <td className="p-3 text-xs text-muted-foreground">{course.level} · {course.language}</td>
                <td className="p-3">{course._count.registrations}</td>
                <td className="p-3">{course.isFree ? <span className="text-xs font-medium text-primary">Gratuit</span> : <span className="flex items-start gap-1.5 text-xs"><BadgeDollarSign className="mt-0.5 h-3.5 w-3.5 text-primary" /><span>Base {formatPrice(course.prices.base, course.prices.currency)}<br />Avancée {formatPrice(course.prices.advanced, course.prices.currency)}</span></span>}<span className="mt-1 block text-[10px] text-muted-foreground">Accès : {course.prices.accessDays} jours</span></td>
                <td className="p-3"><div className="flex flex-col items-start gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${course.active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{course.active ? "Actif" : "Inactif"}</span><Button variant="outline" size="sm" onClick={() => beginEdit(course)}><Pencil className="h-3.5 w-3.5" /> Modifier</Button><Button variant="secondary" size="sm" onClick={() => setContentCourse(course)}>Gérer le contenu</Button></div></td>
              </tr>
            )) : <tr><td colSpan={5} className="p-8 text-center text-sm text-muted-foreground">Aucun cours enregistré. Utilise le formulaire pour en créer un.</td></tr>}
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
      {contentCourse && (
        <CourseContentManager
          courseId={contentCourse.id}
          courseTitle={contentCourse.title}
          onClose={() => setContentCourse(null)}
        />
      )}
    </div>
  );
}
