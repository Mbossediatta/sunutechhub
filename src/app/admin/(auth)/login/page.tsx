"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ShieldCheck, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Remplis tous les champs.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          result &&
          typeof result === "object" &&
          "message" in result &&
          typeof result.message === "string"
            ? result.message
            : "La connexion a échoué. Réessaie.";
        setError(message);
        return;
      }

      router.push("/admin");
      router.refresh();
    } catch {
      setError("Impossible de joindre le serveur. Réessaie dans un instant.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">

      {/* ── Panneau gauche déco ── */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-panel overflow-hidden flex-col items-center justify-center p-16">
        {/* Fond grille */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
        {/* Lumière */}
        <div aria-hidden className="pointer-events-none absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_left,rgba(43,78,255,0.2),transparent_60%)]" />

        <div className="relative z-10 text-center max-w-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary mx-auto mb-6 shadow-lg shadow-primary/40">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h2 className="font-bricolage text-3xl font-bold text-white mb-3">
            Espace Administrateur
          </h2>
          <p className="text-slate-400 leading-relaxed">
            Accès réservé aux administrateurs de Sunu Tech Hub. Toutes les actions sont enregistrées.
          </p>

          {/* Fonctionnalités admin */}
          <div className="mt-10 flex flex-col gap-3 text-left">
            {[
              "Gestion des membres et des rôles",
              "Modération des contenus signalés",
              "Validation des offres d'emploi",
              "Statistiques et revenus",
              "Configuration de la plateforme",
            ].map((f) => (
              <div key={f} className="flex items-center gap-3">
                <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-3 w-3 text-primary" />
                </div>
                <span className="text-sm text-slate-300">{f}</span>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ── Panneau droit — formulaire ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* Logo */}
          <div className="flex flex-col items-center mb-10">
            <Image
              src="/logo-sunutech.png"
              alt="Sunu Tech Hub — Apprendre, partager, construire ensemble"
              width={240}
              height={60}
              priority
              className="mb-1 h-14 w-auto max-w-full rounded-xl bg-white object-contain"
            />
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-widest mt-1">
              Administration
            </span>
          </div>

          {/* Carte formulaire */}
          <div className="bg-card border rounded-2xl p-8 shadow-sm">
            <div className="mb-6">
              <h1 className="font-bricolage text-2xl font-bold mb-1">Connexion Admin</h1>
              <p className="text-sm text-muted-foreground">
                Accès sécurisé réservé aux administrateurs.
              </p>
            </div>

            {/* Alerte erreur */}
            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 bg-accent/10 border border-accent/20 text-accent rounded-xl px-4 py-3 text-sm mb-5"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              {/* E-mail */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-semibold">
                  Adresse e-mail
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@sunutechhub.sn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                  className="rounded-xl"
                  aria-invalid={!!error}
                />
              </div>

              {/* Mot de passe */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-sm font-semibold">
                  Mot de passe
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="rounded-xl pr-11"
                    aria-invalid={!!error}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    aria-label={showPass ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full rounded-xl mt-2 shadow-lg shadow-primary/20 gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="inline-block h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Connexion…
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    Accéder au tableau de bord
                  </>
                )}
              </Button>
            </form>

            {/* Lien retour */}
            <p className="text-xs text-center text-muted-foreground mt-6">
              <a href="/" className="hover:text-primary transition-colors">
                ← Retour au site public
              </a>
            </p>
          </div>

          {/* Avertissement sécurité */}
          <div className="mt-5 flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 border rounded-xl px-4 py-3">
            <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
            <span>
              Toutes les tentatives de connexion sont enregistrées. 
              Cet espace est réservé aux personnes autorisées.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
