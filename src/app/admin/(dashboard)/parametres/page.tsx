"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  Check,
  ImagePlus,
  LoaderCircle,
  Megaphone,
  Pencil,
  Plus,
  Save,
  Shield,
  Trash2,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { usePagination } from "@/hooks/use-pagination";

type Settings = {
  platformName: string;
  contactEmail: string;
  logoUrl: string;
  websiteUrl: string;
  attestationSignatureUrl: string;
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  link: string | null;
  published: boolean;
  updatedAt: string;
  newsletterQueued?: number;
};

type AdminSettingsResponse = {
  settings: Settings;
  announcements: Announcement[];
};

type Profile = { id: string; name: string; email: string };
type AnnouncementDraft = { title: string; body: string; link: string };

const emptySettings: Settings = {
  platformName: "Sunu Tech Hub",
  contactEmail: "",
  logoUrl: "",
  websiteUrl: "",
  attestationSignatureUrl: "",
};

const emptyAnnouncement: AnnouncementDraft = { title: "", body: "", link: "" };

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

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function AdminParametresPage() {
  const [settings, setSettings] = useState<Settings>(emptySettings);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileName, setProfileName] = useState("");
  const [announcementDraft, setAnnouncementDraft] =
    useState<AnnouncementDraft>(emptyAnnouncement);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [busyAnnouncementId, setBusyAnnouncementId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const announcementsPagination = usePagination(announcements);

  const loadData = useCallback(async () => {
    try {
      const [data, profileResponse] = await Promise.all([
        api<AdminSettingsResponse>("settings"),
        fetch("/api/auth/me", { cache: "no-store" }).then(async (response) => {
          const result: unknown = await response.json().catch(() => null);
          if (!response.ok) {
            const message =
              result &&
              typeof result === "object" &&
              "message" in result &&
              typeof result.message === "string"
                ? result.message
                : "Impossible de charger le compte administrateur.";
            throw new Error(message);
          }
          return result as Profile;
        }),
      ]);
      setSettings({ ...emptySettings, ...data.settings });
      setAnnouncements(data.announcements);
      setProfile(profileResponse);
      setProfileName(profileResponse.name);
    } catch (loadError) {
      setError(
        errorMessage(loadError, "Impossible de charger les paramètres."),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadData);
  }, [loadData]);

  const saveSettings = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingSettings(true);
    setError("");
    setNotice("");
    try {
      let attestationSignatureUrl = settings.attestationSignatureUrl;
      if (signatureFile) {
        const uploadResponse = await fetch(
          "/api/admin/courses/banner/upload-url",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              filename: signatureFile.name,
              size: signatureFile.size,
              contentType: signatureFile.type,
            }),
          },
        );
        const uploadResult: unknown = await uploadResponse
          .json()
          .catch(() => null);
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
              : "Impossible de préparer le téléversement de la signature.";
          throw new Error(message);
        }

        const storageResponse = await fetch(uploadResult.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": signatureFile.type },
          body: signatureFile,
          credentials: "omit",
        });
        if (!storageResponse.ok) {
          throw new Error("Le téléversement de la signature a échoué.");
        }

        const verifyResponse = await fetch(
          "/api/admin/courses/banner/verify-upload",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              path: uploadResult.path,
              size: signatureFile.size,
              contentType: signatureFile.type,
            }),
          },
        );
        const verifyResult: unknown = await verifyResponse
          .json()
          .catch(() => null);
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
              : "Impossible de vérifier la signature téléversée.";
          throw new Error(message);
        }
        attestationSignatureUrl = verifyResult.coverImageUrl;
      }

      const saved = await api<Settings>("settings", {
        method: "PATCH",
        body: JSON.stringify({
          ...settings,
          contactEmail: settings.contactEmail || null,
          logoUrl: settings.logoUrl || null,
          websiteUrl: settings.websiteUrl || null,
          attestationSignatureUrl: attestationSignatureUrl || null,
        }),
      });
      setSettings({ ...emptySettings, ...saved });
      setSignatureFile(null);
      setNotice("Les paramètres de la plateforme ont été enregistrés.");
    } catch (saveError) {
      setError(
        errorMessage(saveError, "Impossible d’enregistrer les paramètres."),
      );
    } finally {
      setSavingSettings(false);
    }
  };

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingProfile(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: profileName }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          result &&
          typeof result === "object" &&
          "message" in result &&
          typeof result.message === "string"
            ? result.message
            : "Impossible de mettre à jour le profil.";
        throw new Error(message);
      }
      const updatedProfile = result as Profile;
      setProfile(updatedProfile);
      setProfileName(updatedProfile.name);
      setNotice("Le profil administrateur a été mis à jour.");
    } catch (saveError) {
      setError(
        errorMessage(saveError, "Impossible de mettre à jour le profil."),
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const saveAnnouncement = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingAnnouncement(true);
    setError("");
    setNotice("");
    try {
      const path = editingAnnouncementId
        ? `settings/announcements/${encodeURIComponent(editingAnnouncementId)}`
        : "settings/announcements";
      const saved = await api<Announcement>(path, {
        method: editingAnnouncementId ? "PATCH" : "POST",
        body: JSON.stringify({
          ...announcementDraft,
          link: announcementDraft.link || null,
        }),
      });
      setAnnouncements((current) =>
        editingAnnouncementId
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current],
      );
      setAnnouncementDraft(emptyAnnouncement);
      setEditingAnnouncementId(null);
      setNotice(
        editingAnnouncementId ? "Annonce mise à jour." : "Annonce créée.",
      );
    } catch (saveError) {
      setError(errorMessage(saveError, "Impossible d’enregistrer l’annonce."));
    } finally {
      setSavingAnnouncement(false);
    }
  };

  const toggleAnnouncement = async (announcement: Announcement) => {
    setBusyAnnouncementId(announcement.id);
    setError("");
    setNotice("");
    try {
      const updated = await api<Announcement>(
        `settings/announcements/${encodeURIComponent(announcement.id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ published: !announcement.published }),
        },
      );
      setAnnouncements((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setNotice(
        updated.published
          ? `Annonce publiée. ${updated.newsletterQueued ?? 0} e-mail(s) ajouté(s) à la file des abonnés.`
          : "Annonce masquée.",
      );
    } catch (toggleError) {
      setError(
        errorMessage(toggleError, "Impossible de modifier la publication."),
      );
    } finally {
      setBusyAnnouncementId(null);
    }
  };

  const deleteAnnouncement = async (announcement: Announcement) => {
    if (!window.confirm(`Supprimer l’annonce « ${announcement.title} » ?`))
      return;
    setBusyAnnouncementId(announcement.id);
    setError("");
    setNotice("");
    try {
      await api(
        `settings/announcements/${encodeURIComponent(announcement.id)}`,
        {
          method: "DELETE",
        },
      );
      setAnnouncements((current) =>
        current.filter((item) => item.id !== announcement.id),
      );
      if (editingAnnouncementId === announcement.id) {
        setEditingAnnouncementId(null);
        setAnnouncementDraft(emptyAnnouncement);
      }
      setNotice("Annonce supprimée.");
    } catch (deleteError) {
      setError(errorMessage(deleteError, "Impossible de supprimer l’annonce."));
    } finally {
      setBusyAnnouncementId(null);
    }
  };

  const editAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncementId(announcement.id);
    setAnnouncementDraft({
      title: announcement.title,
      body: announcement.body,
      link: announcement.link ?? "",
    });
  };

  return (
    <div className="flex max-w-5xl flex-col gap-5">
      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive"
        >
          <span>{error}</span>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => {
              setLoading(true);
              setError("");
              void loadData();
            }}
          >
            Réessayer
          </Button>
        </div>
      )}
      {notice && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm text-primary"
        >
          <Check className="h-4 w-4" />
          {notice}
        </p>
      )}
      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border bg-card p-10 text-sm text-muted-foreground">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          Chargement des paramètres…
        </div>
      ) : (
        <>
          <Card>
            <CardContent className="p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <ImagePlus className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bricolage text-lg font-bold">
                    Identité de la plateforme
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Nom, logo et coordonnées visibles sur le site.
                  </p>
                </div>
              </div>
              <form
                onSubmit={saveSettings}
                className="grid gap-4 sm:grid-cols-2"
              >
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  Nom de la plateforme
                  <Input
                    required
                    maxLength={80}
                    value={settings.platformName}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        platformName: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium">
                  E-mail de contact
                  <Input
                    type="email"
                    value={settings.contactEmail}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        contactEmail: event.target.value,
                      })
                    }
                    placeholder="contact@exemple.com"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
                  URL du logo (https://…)
                  <Input
                    type="url"
                    pattern="https://.*"
                    value={settings.logoUrl}
                    onChange={(event) =>
                      setSettings({ ...settings, logoUrl: event.target.value })
                    }
                    placeholder="https://exemple.com/logo.png"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
                  Site web
                  <Input
                    type="url"
                    pattern="https://.*"
                    value={settings.websiteUrl}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        websiteUrl: event.target.value,
                      })
                    }
                    placeholder="https://exemple.com"
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium sm:col-span-2">
                  Signature des attestations (PNG ou JPEG, 1 Mo maximum)
                  <Input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      if (
                        file &&
                        (!["image/png", "image/jpeg"].includes(file.type) ||
                          file.size > 1_000_000)
                      ) {
                        setError(
                          "Choisissez une signature PNG ou JPEG de 1 Mo maximum.",
                        );
                        event.target.value = "";
                        setSignatureFile(null);
                        return;
                      }
                      setError("");
                      setSignatureFile(file);
                    }}
                  />
                </label>
                <div className="flex items-center gap-3 sm:col-span-2">
                  <div className="flex h-16 w-40 items-center justify-center overflow-hidden rounded-xl border bg-muted/30 p-2">
                    {settings.logoUrl ? (
                      <Image
                        src={settings.logoUrl}
                        alt={`Logo ${settings.platformName}`}
                        width={240}
                        height={96}
                        unoptimized
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        Aucun logo personnalisé
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
                    <div className="flex h-20 w-48 items-center justify-center overflow-hidden rounded-xl border bg-muted/30 p-2">
                      {settings.attestationSignatureUrl ? (
                        <Image
                          src={settings.attestationSignatureUrl}
                          alt="Signature affichée sur les attestations"
                          width={240}
                          height={96}
                          unoptimized
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Aucune signature enregistrée
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-start gap-2">
                      <p className="max-w-sm text-xs text-muted-foreground">
                        La signature sera intégrée aux attestations PDF avec le
                        nom du formateur du cours et Sunu Tech Hub comme
                        organisme délivrant.
                        {signatureFile
                          ? ` Fichier choisi : ${signatureFile.name}`
                          : ""}
                      </p>
                      {settings.attestationSignatureUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSettings({
                              ...settings,
                              attestationSignatureUrl: "",
                            });
                            setSignatureFile(null);
                          }}
                        >
                          Retirer la signature
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="max-w-sm text-xs text-muted-foreground">
                    Le logo est utilisé dans l’en-tête du site et de
                    l’administration. Une URL d’image publique est requise.
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <Button
                    type="submit"
                    className="rounded-xl"
                    disabled={savingSettings}
                  >
                    {savingSettings ? (
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Enregistrer les paramètres
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="mb-5 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Megaphone className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="font-bricolage text-lg font-bold">Annonces</h2>
                  <p className="text-sm text-muted-foreground">
                    Rédigez une annonce, puis publiez-la ou masquez-la du site.
                  </p>
                </div>
              </div>
              <form onSubmit={saveAnnouncement} className="grid gap-3">
                <Input
                  required
                  minLength={3}
                  maxLength={120}
                  value={announcementDraft.title}
                  onChange={(event) =>
                    setAnnouncementDraft({
                      ...announcementDraft,
                      title: event.target.value,
                    })
                  }
                  placeholder="Titre de l’annonce"
                />
                <textarea
                  required
                  minLength={3}
                  maxLength={2000}
                  value={announcementDraft.body}
                  onChange={(event) =>
                    setAnnouncementDraft({
                      ...announcementDraft,
                      body: event.target.value,
                    })
                  }
                  placeholder="Message à afficher"
                  rows={3}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Input
                  type="url"
                  pattern="https://.*"
                  value={announcementDraft.link}
                  onChange={(event) =>
                    setAnnouncementDraft({
                      ...announcementDraft,
                      link: event.target.value,
                    })
                  }
                  placeholder="Lien facultatif (https://…)"
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="submit"
                    className="rounded-xl"
                    disabled={savingAnnouncement}
                  >
                    {savingAnnouncement ? (
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    ) : editingAnnouncementId ? (
                      <Save className="mr-2 h-4 w-4" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    {editingAnnouncementId
                      ? "Enregistrer les modifications"
                      : "Créer l’annonce"}
                  </Button>
                  {editingAnnouncementId && (
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => {
                        setEditingAnnouncementId(null);
                        setAnnouncementDraft(emptyAnnouncement);
                      }}
                    >
                      Annuler
                    </Button>
                  )}
                </div>
              </form>
              <div className="mt-5 divide-y rounded-xl border">
                {announcements.length ? (
                  announcementsPagination.pageItems.map((announcement) => (
                    <article
                      key={announcement.id}
                      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">
                            {announcement.title}
                          </h3>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${announcement.published ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                          >
                            {announcement.published ? "Publiée" : "Brouillon"}
                          </span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                          {announcement.body}
                        </p>
                        {announcement.link && (
                          <p className="mt-1 truncate text-xs text-primary">
                            {announcement.link}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-lg"
                          disabled={busyAnnouncementId === announcement.id}
                          onClick={() => void toggleAnnouncement(announcement)}
                        >
                          {busyAnnouncementId === announcement.id ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <Bell className="mr-1.5 h-4 w-4" />
                          )}
                          {announcement.published ? "Masquer" : "Publier"}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-lg"
                          onClick={() => editAnnouncement(announcement)}
                        >
                          <Pencil className="mr-1.5 h-4 w-4" />
                          Modifier
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="rounded-lg text-destructive"
                          disabled={busyAnnouncementId === announcement.id}
                          onClick={() => void deleteAnnouncement(announcement)}
                        >
                          <Trash2 className="mr-1.5 h-4 w-4" />
                          Supprimer
                        </Button>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="p-5 text-center text-sm text-muted-foreground">
                    Aucune annonce pour le moment.
                  </p>
                )}
              </div>
              <PaginationControls
                page={announcementsPagination.page}
                pageSize={announcementsPagination.pageSize}
                totalItems={announcementsPagination.totalItems}
                totalPages={announcementsPagination.totalPages}
                onPageChange={announcementsPagination.setPage}
                onPageSizeChange={announcementsPagination.setPageSize}
              />
            </CardContent>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <CardContent className="p-6">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <UserRound className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-bricolage text-lg font-bold">
                      Compte administrateur
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Modifiez le nom associé à votre compte.
                    </p>
                  </div>
                </div>
                <form onSubmit={saveProfile} className="flex flex-col gap-3">
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Nom affiché
                    <Input
                      required
                      minLength={2}
                      maxLength={120}
                      value={profileName}
                      onChange={(event) => setProfileName(event.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    Adresse e-mail
                    <Input
                      value={profile?.email ?? ""}
                      readOnly
                      aria-describedby="admin-email-note"
                    />
                  </label>
                  <p
                    id="admin-email-note"
                    className="text-xs text-muted-foreground"
                  >
                    L’adresse e-mail de connexion ne peut pas être modifiée
                    depuis cet écran.
                  </p>
                  <Button
                    type="submit"
                    className="w-fit rounded-xl"
                    disabled={savingProfile}
                  >
                    {savingProfile ? (
                      <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Enregistrer le profil
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                    <Shield className="h-5 w-5" />
                  </span>
                  <div>
                    <h2 className="font-bricolage text-lg font-bold">
                      Modération et notifications
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Les outils opérationnels se trouvent dans leurs sections
                      dédiées.
                    </p>
                  </div>
                </div>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Les signalements et les contenus à examiner sont gérés dans
                    l’espace de modération.
                  </p>
                  <p>
                    La configuration d’envoi des e-mails (SMTP) reste une
                    variable serveur afin de ne pas exposer de secrets dans
                    l’interface.
                  </p>
                </div>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Button asChild variant="outline" className="rounded-xl">
                    <Link href="/admin/moderation">Ouvrir la modération</Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-xl">
                    <Link href="/admin/tarifs">Tarifs et paiements</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
