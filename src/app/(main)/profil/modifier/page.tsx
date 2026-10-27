"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SKILL_SUGGESTIONS = ["JavaScript", "React", "Node.js", "Python", "Flutter", "PostgreSQL", "Vue.js", "TypeScript", "PHP", "Java", "Linux", "DevOps"];

export default function ModifierProfilPage() {
  const [name,    setName]   = useState("Moussa Diallo");
  const [city,    setCity]   = useState("Dakar, Sénégal");
  const [bio,     setBio]    = useState("Développeur web passionné, étudiant à l'ESP.");
  const [email,   setEmail]  = useState("moussa@exemple.com");
  const [skills,  setSkills] = useState(["JavaScript", "React", "Node.js"]);
  const [custom,  setCustom] = useState("");
  const [loading, setLoad]   = useState(false);
  const [saved,   setSaved]  = useState(false);

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
    await new Promise((r) => setTimeout(r, 800));
    setLoad(false); setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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

      <form onSubmit={handleSave} className="flex flex-col gap-6">

        {/* Avatar */}
        <div className="flex items-center gap-4 p-5 rounded-2xl border bg-card">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bricolage text-xl font-bold shrink-0">
            {name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-sm mb-1">Photo de profil</p>
            <p className="text-xs text-muted-foreground mb-2">JPG ou PNG, max 2 Mo</p>
            <Button type="button" size="sm" variant="secondary" className="rounded-xl text-xs h-8">
              Changer la photo
            </Button>
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
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl h-11" />
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

        {/* Liens */}
        <div className="rounded-2xl border bg-card p-6 flex flex-col gap-4">
          <h2 className="font-semibold text-base">Liens</h2>
          {[
            { label: "GitHub", placeholder: "https://github.com/ton-compte" },
            { label: "LinkedIn", placeholder: "https://linkedin.com/in/ton-profil" },
            { label: "Portfolio", placeholder: "https://ton-portfolio.com" },
          ].map((l) => (
            <div key={l.label} className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold">{l.label}</label>
              <Input placeholder={l.placeholder} className="rounded-xl h-11" />
            </div>
          ))}
        </div>

        {/* Bouton sauvegarder */}
        <div className="flex items-center gap-3 pt-2 border-t">
          <Button type="submit" className="rounded-xl gap-2 shadow-md shadow-primary/20" disabled={loading}>
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
