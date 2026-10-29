"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SKILL_SUGGESTIONS = ["JavaScript", "React", "Node.js", "Python", "Flutter", "PostgreSQL", "Vue.js", "TypeScript", "PHP", "Java", "Linux", "DevOps"];

export default function ModifierProfilPage() {
  const [name,    setName]   = useState("");
  const [city,    setCity]   = useState("");
  const [bio,     setBio]    = useState("");
  const [email,   setEmail]  = useState("");
  const [skills,  setSkills] = useState<string[]>([]);
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [custom,  setCustom] = useState("");
  const [loading, setLoad]   = useState(false);
  const [saved,   setSaved]  = useState(false);
  const [error, setError] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        const result: unknown = await response.json().catch(() => null);
        if (!response.ok || !result || typeof result !== "object") {
          throw new Error("Impossible de charger votre profil.");
        }
        const profile = result as { name: string; email: string; city: string | null; bio: string | null; interests: string[]; newsletterSubscribed: boolean };
        setName(profile.name);
        setEmail(profile.email);
        setCity(profile.city ?? "");
        setBio(profile.bio ?? "");
        setSkills(profile.interests);
        setNewsletterSubscribed(profile.newsletterSubscribed);
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Impossible de charger votre profil."))
      .finally(() => setProfileLoading(false));
  }, []);

  const addSkill = (s: string) => {
    if (!skills.includes(s)) setSkills((p) => [...p, s]);
  };
  const removeSkill = (s: string) => setSkills((p) => p.filter((x) => x !== s));
  const addCustom = () => {
    if (custom.trim() && !skills.includes(custom.trim())) {
      setSkills((p) => [...p, custom.trim()]);
      setCustom("");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoad(true);
    setError("");
    try {
      const response = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, city, bio, interests: skills, newsletterSubscribed }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message = result && typeof result === "object" && "message" in result && typeof result.message === "string"
          ? result.message
          : "Impossible d’enregistrer votre profil.";
        throw new Error(message);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Impossible d’enregistrer votre profil.");
    } finally {
      setLoad(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
      <Link href="/profil" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 group transition-colors">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        Retour au profil
      </Link>

      <div className="mb-8">
        <p className="text-sm font-semibold text-primary mb-1">Mon compte</p>
        <h1 className="font-bricolage text-3xl font-bold">Modifier mon profil</h1>
      </div>

      {error && <p role="alert" className="mb-5 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
      {profileLoading && <p className="mb-5 text-sm text-muted-foreground">Chargement du profil…</p>}

      <form onSubmit={handleSave} className="flex flex-col gap-6">

        <div className="flex items-center gap-4 rounded-2xl border bg-card p-5">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bricolage text-xl font-bold shrink-0">
            {name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-sm">{name || "Votre profil"}</p>
            <p className="text-xs text-muted-foreground">Avatar généré à partir de votre nom.</p>
          </div>
        </div>

        {/* Infos de base */}
        <div className="rounded-2xl border bg-card p-6 flex flex-col gap-4">
          <h2 className="font-semibold text-base">Informations générales</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold">Nom complet</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl h-11" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold">Ville</label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Dakar, Sénégal" className="rounded-xl h-11" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold">Adresse e-mail</label>
            <Input type="email" value={email} readOnly className="rounded-xl h-11" />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">Bio</label>
              <span className="text-xs text-muted-foreground">{bio.length}/200</span>
            </div>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 200))}
              rows={3}
              placeholder="Décris-toi en quelques phrases…"
              className="w-full rounded-xl border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none transition-all"
            />
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-6">
          <h2 className="font-semibold text-base">Newsletter</h2>
          <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={newsletterSubscribed}
              onChange={(event) => setNewsletterSubscribed(event.target.checked)}
              className="mt-1 h-4 w-4 accent-primary"
            />
            <span>
              <span className="font-medium">Recevoir les annonces par e-mail</span>
              <span className="mt-1 block text-xs text-muted-foreground">
                Tu peux modifier ce choix à tout moment. Chaque e-mail contient
                aussi un lien de désabonnement.
              </span>
            </span>
          </label>
        </div>

        {/* Compétences */}
        <div className="rounded-2xl border bg-card p-6 flex flex-col gap-4">
          <h2 className="font-semibold text-base">Compétences</h2>

          {/* Tags actifs */}
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
                  {s}
                  <button type="button" onClick={() => removeSkill(s)} className="hover:text-destructive transition-colors ml-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Suggestions */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Suggestions</p>
            <div className="flex flex-wrap gap-2">
              {SKILL_SUGGESTIONS.filter((s) => !skills.includes(s)).map((s) => (
                <button key={s} type="button" onClick={() => addSkill(s)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-all">
                  <Plus className="h-3 w-3" /> {s}
                </button>
              ))}
            </div>
          </div>

          {/* Personnalisé */}
          <div className="flex gap-2">
            <Input
              placeholder="Ajouter une compétence…"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())}
              className="rounded-xl h-9 text-sm"
            />
            <Button type="button" size="sm" variant="secondary" onClick={addCustom} className="rounded-xl shrink-0">
              Ajouter
            </Button>
          </div>
        </div>

        {/* Bouton sauvegarder */}
        <div className="flex items-center gap-3 pt-2 border-t">
          <Button type="submit" className="rounded-xl gap-2 shadow-md shadow-primary/20" disabled={loading || profileLoading}>
            {loading
              ? <><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Sauvegarde…</>
              : saved
              ? <><CheckCircle2 className="h-4 w-4" />Sauvegardé !</>
              : "Sauvegarder les modifications"
            }
          </Button>
          {saved && <span className="text-sm text-primary font-medium">Profil mis à jour.</span>}
          <Button type="button" variant="ghost" className="rounded-xl ml-auto" asChild>
            <Link href="/profil">Annuler</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
