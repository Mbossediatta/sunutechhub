"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewsletterForm() {
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value.trim() }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const detail =
          result &&
          typeof result === "object" &&
          "message" in result &&
          typeof result.message === "string"
            ? result.message
            : "Impossible de t’abonner pour le moment.";
        throw new Error(detail);
      }
      setValue("");
      setMessage("Tu es bien abonné(e). Les annonces et événements arriveront par e-mail.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Impossible de t’abonner pour le moment.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5 sm:flex-row">
        <Input
          type="email"
          placeholder="Ton adresse e-mail"
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 bg-white/10 border-white/15 text-white placeholder:text-slate-400 focus-visible:ring-primary focus-visible:border-primary rounded-xl"
          aria-label="Adresse e-mail"
        />
        <Button type="submit" disabled={loading} className="shrink-0 gap-1.5 rounded-xl">
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : "S’abonner"}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </Button>
      </form>
      {message && <p role="status" className="text-xs text-emerald-300">{message}</p>}
      {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
      <p className="text-center text-xs text-slate-400">
        Aucun compte nécessaire.{" "}
        <Link href="/inscription" className="font-medium text-primary hover:underline">
          Créer un compte
        </Link>
        {" "}pour participer à la communauté.
      </p>
    </div>
  );
}
