"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Upload, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TECH_SUGGESTIONS = ["React", "Next.js", "Node.js", "Flutter", "Python", "PostgreSQL", "Firebase", "MongoDB", "Django", "Vue.js", "TypeScript", "Tailwind CSS"];

type Step = 1 | 2 | 3;

export default function NouveauProjetPage() {
  const [step,    setStep]   = useState<Step>(1);
  const [title,   setTitle]  = useState("");
  const [desc,    setDesc]   = useState("");
  const [url,     setUrl]    = useState("");
  const [techs,   setTechs]  = useState<string[]>([]);
  const [custom,  setCustom] = useState("");
  const [loading, setLoad]   = useState(false);
  const [done,    setDone]   = useState(false);

  const toggleTech = (t: string) =>
    setTechs((p) => p.includes(t) ? p.filter((x) => x !== t) : [...p, t]);

  const addCustom = () => {
    if (custom.trim() && !techs.includes(custom.trim())) {
      setTechs((p) => [...p, custom.trim()]);
      setCustom("");
    }
  };

  const handlePublish = async () => {
    setLoad(true);
    await new Promise((r) => setTimeout(r, 900));
    setLoad(false); setDone(true);
  };

  if (done) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="h-10 w-10 text-primary" />
        </div>
        <h1 className="font-bricolage text-2xl font-bold mb-2">Projet publié !</h1>
        <p className="text-muted-foreground mb-8">La communauté peut maintenant voir et commenter ton projet.</p>
        <div className="flex gap-3 justify-center">
          <Button asChild><Link href="/projets">Voir tous les projets</Link></Button>
          <Button variant="secondary" onClick={() => { setStep(1); setTitle(""); setDesc(""); setUrl(""); setTechs([]); setDone(false); }}>
            Publier un autre projet
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
      <Link href="/projets" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 group transition-colors">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        Retour aux projets
      </Link>

      {/* En-tête */}
      <div className="mb-8">
        <p className="text-sm font-semibold text-primary mb-1">Communauté</p>
        <h1 className="font-bricolage text-3xl font-bold mb-2">Partager mon projet</h1>
        <p className="text-muted-foreground">Montre ce que tu as construit. La communauté adorera.</p>
      </div>

      {/* Indicateur d'étape */}
      <div className="flex items-center gap-3 mb-8">
        {[
          { n: 1, label: "Informations" },
          { n: 2, label: "Captures" },
          { n: 3, label: "Publication" },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2 flex-1">
            <div className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all",
              step > s.n ? "bg-primary text-primary-foreground" :
              step === s.n ? "bg-primary text-primary-foreground" :
              "bg-muted text-muted-foreground"
            )}>
              {step > s.n ? <CheckCircle2 className="h-4 w-4" /> : s.n}
            </div>
            <span className={cn("text-xs font-medium hidden sm:block", step >= s.n ? "text-foreground" : "text-muted-foreground")}>
              {s.label}
            </span>
            {i < 2 && <div className={cn("flex-1 h-0.5 rounded-full", step > s.n ? "bg-primary" : "bg-border")} />}
          </div>
        ))}
      </div>

      {/* ── ÉTAPE 1 ── */}
      {step === 1 && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold">Nom du projet <span className="text-destructive">*</span></label>
            <Input placeholder="Ex: SenShop — E-commerce pour artisans" value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl h-11" />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold">Description <span className="text-destructive">*</span></label>
            <textarea
              placeholder="Décris ton projet en 2-3 phrases. Quel problème résout-il ? Pour qui ?"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={4}
              className="w-full rounded-xl border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold">Technologies utilisées</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {TECH_SUGGESTIONS.map((t) => (
                <button key={t} type="button" onClick={() => toggleTech(t)} aria-pressed={techs.includes(t)}
                  className={cn("px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                    techs.includes(t) ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary hover:text-primary bg-background"
                  )}>
                  {t}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input placeholder="Autre technologie…" value={custom} onChange={(e) => setCustom(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustom())}
                className="rounded-xl h-9 text-sm flex-1" />
              <Button size="sm" variant="secondary" onClick={addCustom} className="rounded-xl shrink-0">Ajouter</Button>
            </div>
            {techs.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {techs.map((t) => <Badge key={t} variant="default" className="gap-1 text-xs">{t}</Badge>)}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold">Lien démo ou GitHub</label>
            <Input placeholder="https://github.com/ton-repo ou https://ton-projet.vercel.app" value={url} onChange={(e) => setUrl(e.target.value)} className="rounded-xl h-11" />
          </div>

          <div className="flex justify-end pt-2 border-t">
            <Button className="rounded-xl gap-2" onClick={() => setStep(2)} disabled={!title.trim() || !desc.trim()}>
              Suivant <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── ÉTAPE 2 ── */}
      {step === 2 && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold">Captures d&apos;écran</label>
            <p className="text-xs text-muted-foreground">Ajoute 1 à 5 captures pour montrer ton projet. PNG ou JPG, max 2 Mo chacune.</p>
            <div className="border-2 border-dashed border-border rounded-2xl p-10 text-center hover:border-primary transition-colors cursor-pointer">
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">Glisse tes captures ici</p>
              <p className="text-xs text-muted-foreground">ou clique pour sélectionner</p>
            </div>
          </div>

          <div className="rounded-xl bg-muted/50 border p-4 text-sm">
            <p className="font-semibold mb-1">💡 Conseils pour de bonnes captures</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Montre les pages principales de ton app</li>
              <li>• Utilise des données réalistes (pas des lorem ipsum)</li>
              <li>• Capture les deux versions mobile et desktop si possible</li>
            </ul>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <Button variant="secondary" className="rounded-xl" onClick={() => setStep(1)}>
              <ArrowLeft className="h-4 w-4" /> Retour
            </Button>
            <Button className="rounded-xl gap-2" onClick={() => setStep(3)}>
              Suivant <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── ÉTAPE 3 ── */}
      {step === 3 && (
        <div className="flex flex-col gap-6">
          <div className="rounded-2xl border bg-card p-6">
            <h3 className="font-bricolage font-bold text-lg mb-4">Récapitulatif</h3>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground w-24 shrink-0">Projet</span>
                <span className="font-medium">{title}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground w-24 shrink-0">Description</span>
                <span className="text-muted-foreground line-clamp-2">{desc}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-muted-foreground w-24 shrink-0">Technologies</span>
                <div className="flex flex-wrap gap-1">
                  {techs.length > 0
                    ? techs.map((t) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)
                    : <span className="text-muted-foreground">Aucune</span>}
                </div>
              </div>
              {url && (
                <div className="flex items-start gap-2">
                  <span className="text-muted-foreground w-24 shrink-0">Lien</span>
                  <span className="text-primary text-xs truncate">{url}</span>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-muted/50 border p-4 text-sm">
            <p className="text-xs text-muted-foreground">
              En publiant, tu confirmes que ce projet est le tien ou que tu as les droits de le partager.
              Il sera visible par toute la communauté et indexé dans les recherches.
            </p>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <Button variant="secondary" className="rounded-xl" onClick={() => setStep(2)}>
              <ArrowLeft className="h-4 w-4" /> Retour
            </Button>
            <Button className="rounded-xl gap-2 shadow-md shadow-primary/20" onClick={handlePublish} disabled={loading}>
              {loading
                ? <><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Publication…</>
                : <><CheckCircle2 className="h-4 w-4" />Publier le projet</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
