"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const suggestedTags = ["JavaScript", "React", "Node.js", "Python", "PostgreSQL", "Flutter", "CSS", "Linux", "API", "Next.js"];

export default function NouvelleQuestionPage() {
  const [title, setTitle]   = useState("");
  const [body, setBody]     = useState("");
  const [tags, setTags]     = useState<string[]>([]);
  const [sent, setSent]     = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [questionId, setQuestionId] = useState("");

  const toggleTag = (t: string) =>
    setTags((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : prev.length < 5 ? [...prev, t] : prev);

  const canSubmit = title.trim().length >= 10 && body.trim().length >= 20;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/community/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, subjects: tags }),
      });
      const result: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          result &&
          typeof result === "object" &&
          "message" in result &&
          typeof result.message === "string"
            ? result.message
            : "Impossible de publier la question.";
        throw new Error(Array.isArray(message) ? message.join(" ") : message);
      }
      if (!result || typeof result !== "object" || !("id" in result) || typeof result.id !== "string") {
        throw new Error("La question a été reçue, mais la réponse du serveur est invalide.");
      }
      setQuestionId(result.id);
      setSent(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Impossible de publier la question.");
    } finally {
      setSaving(false);
    }
  };

  if (sent) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="text-6xl mb-6">✓</div>
        <h1 className="font-bricolage text-2xl font-bold mb-3">Question publiée !</h1>
        <p className="text-muted-foreground mb-8">La question est enregistrée. Consulte-la ou partage-la avec la communauté.</p>
        <div className="flex gap-3 justify-center">
          <Button asChild><Link href={`/questions/${questionId}`}>Voir ma question</Link></Button>
          <Button variant="secondary" asChild><Link href="/questions">Toutes les questions</Link></Button>
          <Button variant="secondary" onClick={() => { setTitle(""); setBody(""); setTags([]); setSent(false); }}>
            Poser une autre question
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      {/* Retour */}
      <Link href="/questions" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 group transition-colors">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        Retour aux questions
      </Link>

      <div className="mb-8">
        <p className="text-sm font-semibold text-primary mb-1">Communauté</p>
        <h1 className="font-bricolage text-3xl font-bold mb-2">Poser une question</h1>
        <p className="text-muted-foreground">Sois précis — une bonne question obtient de meilleures réponses.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {error && <p role="alert" className="rounded-xl border border-accent/20 bg-accent/10 p-4 text-sm text-accent">{error}</p>}

        {/* Titre */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold">Titre de ta question <span className="text-accent">*</span></label>
            <span className={`text-xs ${title.length >= 10 ? "text-primary" : "text-muted-foreground"}`}>
              {title.length}/120
            </span>
          </div>
          <Input
            placeholder="Ex: Comment créer une API REST avec Node.js ?"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 120))}
            className="rounded-xl text-base h-12"
          />
          {title.length > 0 && title.length < 10 && (
            <p className="text-xs text-muted-foreground">⚠ Sois plus précis — au moins 10 caractères</p>
          )}
        </div>

        {/* Corps */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold">Détails <span className="text-accent">*</span></label>
            <span className={`text-xs ${body.length >= 20 ? "text-primary" : "text-muted-foreground"}`}>
              {body.length} caractères
            </span>
          </div>
          <textarea
            placeholder="Décris ton problème en détail. Qu'as-tu déjà essayé ? Quel est le message d'erreur ?"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className="w-full rounded-xl border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none transition-all"
          />
          <p className="text-xs text-muted-foreground">
            Markdown supporté : **gras**, `code`, ```bloc de code```
          </p>
        </div>

        {/* Tags */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold">Sujets</label>
            <span className="text-xs text-muted-foreground">{tags.length}/5 sélectionnés</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedTags.map((t) => {
              const active = tags.includes(t);
              return (
                <button key={t} type="button" aria-pressed={active} onClick={() => toggleTag(t)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all duration-150 ${
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:border-primary hover:text-primary bg-card"
                  }`}>
                  {t}
                </button>
              );
            })}
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {tags.map((t) => <Badge key={t} variant="default" className="gap-1">{t}</Badge>)}
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="rounded-2xl bg-muted/60 border p-4 text-sm">
          <p className="font-semibold mb-2">💡 Conseils pour une bonne question</p>
          <ul className="text-muted-foreground space-y-1 text-xs">
            <li>• Décris clairement ce que tu veux faire</li>
            <li>• Montre ce que tu as déjà essayé</li>
            <li>• Copie le message d&apos;erreur exact si tu en as un</li>
            <li>• Ajoute un exemple de code minimal si possible</li>
          </ul>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            En publiant, tu acceptes les{" "}
            <Link href="/regles" className="text-primary hover:underline">règles de la communauté</Link>.
          </p>
          <Button
            type="submit"
            disabled={!canSubmit || saving}
            className="rounded-xl gap-2 shadow-sm shadow-primary/20"
          >
            <Send className="h-4 w-4" /> {saving ? "Publication…" : "Publier la question"}
          </Button>
        </div>
      </form>
    </div>
  );
}
