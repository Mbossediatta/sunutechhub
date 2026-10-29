"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { submitAuthForm } from "@/lib/auth-client";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

const INTERESTS = [
  "JavaScript",
  "Python",
  "React",
  "Flutter",
  "Node.js",
  "PostgreSQL",
  "Linux",
  "IA / ML",
  "Cybersécurité",
  "Design UI/UX",
  "DevOps",
  "Mobile",
];

type Step = 1 | 2 | 3;

export default function InscriptionPage() {
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [welcomeEmailSent, setWelcomeEmailSent] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    email?: string;
    pass?: string;
  }>({});
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const initialEmail = search.get("email");
    if (initialEmail) setEmail(initialEmail);
    const welcomeStatus = search.get("welcome");
    if (welcomeStatus === "envoye" || welcomeStatus === "non-envoye") {
      setWelcomeEmailSent(welcomeStatus === "envoye");
      setStep(3);
    }
    if (search.has("google")) {
      setSubmitError(
        search.get("google") === "annule"
          ? "La connexion Google a été annulée."
          : "La connexion Google n’a pas abouti. Réessaie ou crée ton compte par e-mail.",
      );
    }
  }, []);

  const toggle = (item: string) =>
    setSel((p) =>
      p.includes(item) ? p.filter((x) => x !== item) : [...p, item],
    );

  const validateStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (name.trim().length < 2 || name.trim().length > 100)
      errs.name = "Saisis ton nom (2 à 100 caractères).";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errs.email = "Saisis une adresse comme prenom@exemple.com.";
    if (password.length < 8 || password.length > 72)
      errs.pass = "Le mot de passe doit contenir entre 8 et 72 caractères.";
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setStep(2);
  };

  const handleStep2 = async () => {
    setLoading(true);
    setSubmitError("");
    try {
      const result = await submitAuthForm("register", {
        name: name.trim(),
        email: email.trim(),
        password,
        interests: sel,
        newsletterSubscribed,
      });
      setWelcomeEmailSent(result.welcomeEmailSent === true);
      setStep(3);
    } catch (authError) {
      setSubmitError(
        authError instanceof Error
          ? authError.message
          : "La création du compte a échoué.",
      );
    } finally {
      setLoading(false);
    }
  };

  /* Score mot de passe */
  const pwScore =
    (password.length >= 8 ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/[0-9]/.test(password) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(password) ? 1 : 0);
  const pwLabels = ["", "Faible", "Moyen", "Bon", "Fort"];
  const pwColors = [
    "bg-border",
    "bg-destructive",
    "bg-accent",
    "bg-primary/70",
    "bg-primary",
  ];

  return (
    <div className="min-h-[100svh] flex flex-col lg:flex-row">
      {/* ── Panneau gauche — déco ── */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 min-h-[100svh] relative overflow-hidden bg-panel flex-col">
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:44px_44px]"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_80%,rgba(124,92,255,0.2),transparent_55%)]"
        />

        <div className="relative z-10 flex flex-col justify-between h-full p-10 xl:p-14">
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

          <div>
            <h2 className="font-bricolage text-3xl xl:text-4xl font-extrabold text-white leading-tight mb-4">
              Rejoins la communauté
              <br />
              développeurs sénégalais.
            </h2>
            <p className="text-slate-400 leading-relaxed mb-10 max-w-sm">
              Une communauté gratuite pour apprendre, partager et grandir
              ensemble dans la tech.
            </p>

            <p className="max-w-sm text-slate-400">
              Crée ton compte pour suivre des cours, poser tes questions et
              partager tes réalisations avec d’autres membres.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />Une communauté ouverte
            </span>
          </div>
        </div>
      </div>

      {/* ── Panneau droit — formulaire ── */}
      <div className="flex-1 flex flex-col items-center justify-start px-4 py-6 sm:justify-center sm:px-8 sm:py-10 lg:py-12 bg-background">
        <div className="w-full max-w-[400px]">
          {/* Logo mobile */}
          <div className="flex lg:hidden justify-center mb-4 sm:mb-6">
            <Link href="/">
              <Image
                src="/logo-sunutech.png"
                alt="Sunu Tech Hub — Apprendre, partager, construire ensemble"
                width={220}
                height={55}
                priority
                className="h-10 w-auto rounded-lg bg-white object-contain sm:h-12"
              />
            </Link>
          </div>

          {/* Titre + indicateur */}
          {step < 3 && (
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                {step === 2 && (
                  <button
                    onClick={() => setStep(1)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Retour"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}
                <div className="flex gap-1.5 flex-1">
                  {[1, 2].map((s) => (
                    <div
                      key={s}
                      className={cn(
                        "h-1.5 flex-1 rounded-full transition-all duration-300",
                        s <= step ? "bg-primary" : "bg-border",
                      )}
                    />
                  ))}
                </div>
                <span className="text-xs text-muted-foreground font-medium shrink-0">
                  {step}/2
                </span>
              </div>
              <h1 className="font-bricolage text-2xl font-bold mb-1">
                {step === 1 ? "Crée ton compte" : "Tes centres d'intérêt"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {step === 1
                  ? "Dalal ak jàmm — bienvenue 🇸🇳"
                  : "Choisis au moins 3 sujets."}
              </p>
            </div>
          )}

          {/* ── ÉTAPE 1 ── */}
          {step === 1 && (
            <>
              <GoogleSignInButton label="Continuer avec Google" />
              {submitError && (
                <p
                  role="alert"
                  className="mb-4 rounded-xl border border-destructive/15 bg-destructive/8 px-4 py-3 text-sm text-destructive"
                >
                  {submitError}
                </p>
              )}

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">
                  ou avec ton e-mail
                </span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <form
                onSubmit={validateStep1}
                className="flex flex-col gap-4"
                noValidate
              >
                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-sm font-semibold"
                    htmlFor="register-name"
                  >
                    Nom complet
                  </label>
                  <Input
                    id="register-name"
                    placeholder="Prénom et nom"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    className="rounded-xl h-11"
                    aria-invalid={!!errors.name}
                    required
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">! {errors.name}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-sm font-semibold"
                    htmlFor="register-email"
                  >
                    Adresse e-mail
                  </label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="prenom@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="rounded-xl h-11"
                    aria-invalid={!!errors.email}
                    required
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">! {errors.email}</p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    className="text-sm font-semibold"
                    htmlFor="register-password"
                  >
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Input
                      id="register-password"
                      type={showPass ? "text" : "password"}
                      placeholder="8 caractères minimum"
                      value={password}
                      onChange={(e) => setPass(e.target.value)}
                      autoComplete="new-password"
                      className="rounded-xl h-11 pr-11"
                      aria-invalid={!!errors.pass}
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
                  {errors.pass && (
                    <p className="text-xs text-destructive">! {errors.pass}</p>
                  )}
                  {password.length > 0 && (
                    <div className="mt-1">
                      <div className="flex gap-1 mb-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={cn(
                              "h-1 flex-1 rounded-full transition-all duration-300",
                              i <= pwScore ? pwColors[pwScore] : "bg-border",
                            )}
                          />
                        ))}
                      </div>
                      {pwScore > 0 && (
                        <p className="text-[11px] text-muted-foreground">
                          {pwLabels[pwScore]}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full rounded-xl gap-2 shadow-md shadow-primary/20 h-11"
                >
                  Continuer <ArrowRight className="h-4 w-4" />
                </Button>
              </form>

              <p className="text-xs text-center text-muted-foreground mt-5">
                En créant un compte, tu acceptes nos{" "}
                <Link
                  href="/conditions"
                  className="text-primary hover:underline"
                >
                  conditions
                </Link>
                .
              </p>
            </>
          )}

          {/* ── ÉTAPE 2 ── */}
          {step === 2 && (
            <>
              <div className="flex flex-wrap gap-2 mb-5">
                {INTERESTS.map((item) => {
                  const active = sel.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggle(item)}
                      className={cn(
                        "px-3.5 py-2 rounded-full text-sm font-medium border transition-all duration-150",
                        active
                          ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                          : "border-border text-muted-foreground hover:border-primary hover:text-primary bg-background",
                      )}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground mb-5">
                <span>
                  <strong className="text-foreground">{sel.length}</strong>{" "}
                  sélectionné{sel.length > 1 ? "s" : ""}
                </span>
                {sel.length < 3 && (
                  <span className="text-primary font-medium">
                    Encore {3 - sel.length} requis
                  </span>
                )}
              </div>

              <label className="mb-5 flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-4 text-sm">
                <input
                  type="checkbox"
                  checked={newsletterSubscribed}
                  onChange={(event) => setNewsletterSubscribed(event.target.checked)}
                  className="mt-1 h-4 w-4 accent-primary"
                />
                <span>
                  <span className="font-semibold">Recevoir la newsletter Sunu Tech Hub</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Recevoir par e-mail les annonces et actualités publiées. Tu
                    peux te désabonner à tout moment. Cette option est facultative.
                  </span>
                </span>
              </label>

              <Button
                size="lg"
                className="w-full rounded-xl gap-2 shadow-md shadow-primary/20 h-11"
                onClick={handleStep2}
                disabled={sel.length < 3 || loading}
              >
                {loading ? (
                  <>
                    <Spinner />
                    Création du compte…
                  </>
                ) : (
                  <>
                    <span>Terminer l&apos;inscription</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
              {submitError && (
                <p
                  role="alert"
                  className="mt-3 rounded-xl border border-destructive/15 bg-destructive/8 px-4 py-3 text-sm text-destructive"
                >
                  {submitError}
                  {submitError === "Cette adresse e-mail est déjà utilisée." && (
                    <>
                      {" "}
                      <Link
                        href={`/connexion?email=${encodeURIComponent(email.trim())}`}
                        className="font-semibold underline underline-offset-2"
                      >
                        Connecte-toi avec cette adresse.
                      </Link>
                    </>
                  )}
                </p>
              )}
            </>
          )}

          {/* ── ÉTAPE 3 — Succès ── */}
          {step === 3 && (
            <div className="text-center py-2">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="h-10 w-10 text-primary" />
              </div>
              <h2 className="font-bricolage text-2xl font-bold mb-2">
                Jërëjëf ! Bienvenue.
              </h2>
              <p className="text-muted-foreground text-sm mb-8 max-w-xs mx-auto leading-relaxed">
                Ton compte est prêt.{" "}
                {welcomeEmailSent
                  ? "Un e-mail de bienvenue vient de t’être envoyé."
                  : "Tu es connecté·e. L’e-mail de bienvenue n’a pas pu être envoyé pour le moment."}{" "}
                Commence par explorer les questions ou suis un cours gratuit.
              </p>
              <div className="flex flex-col gap-3">
                <Button
                  size="lg"
                  className="w-full rounded-xl gap-2 shadow-md shadow-primary/20 h-11"
                  asChild
                >
                  <Link href="/questions">
                    Explorer les questions <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  className="w-full rounded-xl h-11"
                  asChild
                >
                  <Link href="/cours">Voir les cours gratuits</Link>
                </Button>
              </div>
            </div>
          )}

          {step < 3 && (
            <p className="text-sm text-center text-muted-foreground mt-6">
              Tu as déjà un compte ?{" "}
              <Link
                href="/connexion"
                className="text-primary font-semibold hover:underline"
              >
                Connexion
              </Link>
            </p>
          )}
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
