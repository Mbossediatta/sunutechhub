"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  ArrowRight,
  MessageSquare,
  BookOpen,
  Rocket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestMagicLink, submitAuthForm } from "@/lib/auth-client";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

export default function ConnexionPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicMessage, setMagicMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const initialEmail = search.get("email");
    if (initialEmail) setEmail(initialEmail);
    const googleError = search.get("google");
    if (googleError) {
      const googleMessages: Record<string, string> = {
        annule: "La connexion Google a été annulée.",
        configuration:
          "Vérifie dans Google Cloud Console que l’URI autorisée correspond exactement à http://localhost:3000/api/auth/google/callback, et que les identifiants OAuth sont valides.",
        callback:
          "L’URI de retour ne correspond pas à celle autorisée dans Google Cloud Console.",
        expired: "Le code Google a expiré. Réessaie la connexion.",
        indisponible:
          "Le service de connexion est momentanément indisponible. Réessaie.",
        refuse: "Google n’a pas pu valider la connexion. Vérifie la configuration OAuth et réessaie.",
        invalid: "La vérification de sécurité Google a échoué. Recommence la connexion.",
      };
      setError(
        googleMessages[googleError] ??
          "La connexion Google n’a pas abouti. Réessaie ou connecte-toi avec ton adresse e-mail.",
      );
    }

    const magicError = search.get("magic");
    if (magicError) {
      setError(
        magicError === "unavailable"
          ? "Le service de connexion est momentanément indisponible."
          : "Ce lien magique est invalide ou a expiré. Demande-en un nouveau.",
      );
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || !password) {
      setError("Saisis une adresse e-mail valide et ton mot de passe.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { user } = await submitAuthForm("login", {
        email: email.trim(),
        password,
      });
      router.replace(user.role === "ADMIN" ? "/admin" : "/questions");
      router.refresh();
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "La connexion a échoué.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Saisis une adresse e-mail valide pour recevoir ton lien.");
      return;
    }
    setError("");
    setMagicMessage("");
    setMagicLoading(true);
    try {
      setMagicMessage(await requestMagicLink(email.trim()));
    } catch (magicError) {
      setError(
        magicError instanceof Error
          ? magicError.message
          : "Impossible d’envoyer le lien de connexion.",
      );
    } finally {
      setMagicLoading(false);
    }
  };

  return (
    <div className="min-h-[100svh] flex flex-col lg:flex-row">
      {/* ── Panneau gauche — déco (desktop) ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 min-h-[100svh] relative overflow-hidden bg-panel flex-col">
        {/* Grille */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:44px_44px]"
        />
        {/* Lumière */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(43,78,255,0.25),transparent_55%)]"
        />

        <div className="relative z-10 flex flex-col justify-between h-full p-10 xl:p-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 w-fit">
            <Image
              src="/logo-sunutech.png"
              alt="Sunu Tech Hub — Apprendre, partager, construire ensemble"
              width={220}
              height={55}
              priority
              className="h-12 w-auto rounded-lg bg-white object-contain"
            />
          </Link>

          {/* Contenu central */}
          <div>
            <h2 className="font-bricolage text-3xl xl:text-4xl font-extrabold text-white leading-tight mb-4">
              La communauté tech
              <br />
              du Sénégal t&apos;attend.
            </h2>
            <p className="text-slate-400 leading-relaxed mb-8 max-w-sm">
              Pose tes questions, suis des cours gratuits en wolof et en
              français, partage tes projets.
            </p>

            <div className="flex flex-col gap-4">
              {[
                { icon: MessageSquare, label: "Échanger autour de questions tech" },
                { icon: BookOpen, label: "Apprendre avec les cours" },
                { icon: Rocket, label: "Partager des projets réalisés" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-white/8 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm text-slate-300 font-medium">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-slate-500">
            © 2026 Sunu Tech Hub · Fait au Sénégal 🇸🇳
          </p>
        </div>
      </div>

      {/* ── Panneau droit — formulaire ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 sm:px-8 lg:py-12 bg-background">
        <div className="w-full max-w-[400px]">
          {/* Logo mobile */}
          <div className="flex lg:hidden justify-center mb-8">
            <Link href="/" className="group">
              <Image
                src="/logo-sunutech.png"
                alt="Sunu Tech Hub — Apprendre, partager, construire ensemble"
                width={220}
                height={55}
                priority
                className="h-12 w-auto rounded-lg bg-white object-contain"
              />
            </Link>
          </div>

          {/* Titre */}
          <div className="mb-7">
            <h1 className="font-bricolage text-2xl font-bold mb-1">
              Bon retour 👋
            </h1>
            <p className="text-sm text-muted-foreground">
              Content de te revoir sur Sunu Tech Hub.
            </p>
          </div>

          {/* Google */}
          <GoogleSignInButton label="Continuer avec Google" />

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">ou par e-mail</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Erreur */}
          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 bg-destructive/8 border border-destructive/15 text-destructive rounded-xl px-4 py-3 text-sm mb-4"
            >
              <span className="font-bold">!</span>
              {error}
            </div>
          )}

          {/* Formulaire */}
          <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
            noValidate
          >
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold" htmlFor="login-email">
                Adresse e-mail
              </label>
              <Input
                id="login-email"
                type="email"
                placeholder="prenom@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                autoFocus
                className="rounded-xl h-11"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  className="text-sm font-semibold"
                  htmlFor="login-password"
                >
                  Mot de passe
                </label>
                <Link
                  href="/mot-de-passe-oublie"
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Oublié ?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="rounded-xl h-11 pr-11"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPass ? "Masquer" : "Afficher"}
                >
                  {showPass ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full rounded-xl gap-2 shadow-md shadow-primary/20 h-11"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner />
                  Connexion…
                </>
              ) : (
                <>
                  <span>Se connecter</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground">ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <Button
            variant="secondary"
            size="lg"
            className="w-full rounded-xl h-11"
            onClick={handleMagicLink}
            disabled={magicLoading}
          >
            {magicLoading ? "Envoi du lien…" : "Recevoir un lien de connexion"}
          </Button>
          {magicMessage && (
            <p
              role="status"
              className="mt-3 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-muted-foreground"
            >
              {magicMessage}
            </p>
          )}

          <p className="text-sm text-center text-muted-foreground mt-6">
            Pas encore de compte ?{" "}
            <Link
              href="/inscription"
              className="text-primary font-semibold hover:underline"
            >
              S&apos;inscrire gratuitement
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <span className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
  );
}
