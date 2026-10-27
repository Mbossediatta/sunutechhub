"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function MotDePasseOubliePage() {
  const [email,   setEmail]  = useState("");
  const [sent,    setSent]   = useState(false);
  const [loading, setLoad]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoad(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoad(false); setSent(true);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px]">

        <Link href="/connexion" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 group transition-colors">
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Retour à la connexion
        </Link>

        {!sent ? (
          <div className="bg-card border rounded-2xl p-8 shadow-sm">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
              <Mail className="h-6 w-6 text-primary" />
            </div>
            <h1 className="font-bricolage text-2xl font-bold mb-1">Mot de passe oublié ?</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Saisis ton adresse e-mail. On t&apos;envoie un lien pour réinitialiser ton mot de passe.
            </p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold">Adresse e-mail</label>
                <Input
                  type="email"
                  placeholder="prenom@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  className="rounded-xl h-11"
                />
              </div>
              <Button type="submit" size="lg" className="w-full rounded-xl shadow-md shadow-primary/20 h-11" disabled={loading || !email}>
                {loading
                  ? <><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Envoi…</>
                  : "Envoyer le lien de réinitialisation"}
              </Button>
            </form>
          </div>
        ) : (
          <div className="bg-card border rounded-2xl p-8 shadow-sm text-center">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <h2 className="font-bricolage text-xl font-bold mb-2">E-mail envoyé !</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Si un compte est associé à <strong>{email}</strong>, tu recevras un lien dans les prochaines minutes.
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              Vérifie aussi tes spams si tu ne reçois rien.
            </p>
            <Button variant="secondary" size="lg" className="w-full rounded-xl" asChild>
              <Link href="/connexion">Retour à la connexion</Link>
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
