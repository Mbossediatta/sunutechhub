"use client";

import { useState, useEffect } from "react";
import { ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

const ANSWERS = [
  {
    id: "a1",
    author: { name: "Aminata Diallo", city: "Dakar" },
    content: `Pour créer une API REST bien organisée avec Node.js et Express, voici la structure recommandée :\n\nsrc/\n├── routes/        # Endpoints\n├── controllers/   # Logique métier\n├── middlewares/   # Auth, validation\n├── models/        # Schémas\n└── app.js\n\nLes routes ne font que définir les endpoints. Toute la logique va dans les controllers.`,
    votes: 18,
    isValidated: true,
    createdAt: "2026-10-07T17:00:00.000Z",
  },
  {
    id: "a2",
    author: { name: "Seydou Traoré", city: "Thiès" },
    content: `Je rajouterais l'utilisation d'un router Express par ressource — par exemple routes/users.js pour tout ce qui concerne les utilisateurs. Ça rend le code lisible quand le projet grandit.`,
    votes: 7,
    isValidated: false,
    createdAt: "2026-10-07T17:30:00.000Z",
  },
];

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

interface Question {
  votes: number; answers: number;
  author: { name: string; city: string };
  createdAt: string; excerpt?: string;
}

export function QuestionDetailClient({ question }: { question: Question }) {
  const [relTime, setRelTime] = useState("");
  const [reply, setReply]     = useState("");

  useEffect(() => { setRelTime(formatRelativeTime(question.createdAt)); }, [question.createdAt]);

  return (
    <>
      {/* Meta */}
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-6 pb-6 border-b">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
          {getInitials(question.author.name)}
        </span>
        <span className="font-medium text-foreground">{question.author.name}</span>
        <span>·</span>
        <span>{question.author.city}</span>
        <span>·</span>
        <span suppressHydrationWarning>{relTime}</span>
        <span>·</span>
        <span>{question.votes} votes · {question.answers} réponses</span>
      </div>

      {question.excerpt && (
        <div className="bg-muted/50 rounded-2xl p-6 mb-10 border">
          <p className="text-foreground leading-relaxed">{question.excerpt}</p>
        </div>
      )}

      {/* Réponses */}
      <h2 className="font-bricolage text-xl font-bold mb-5">
        {ANSWERS.length} réponse{ANSWERS.length > 1 ? "s" : ""}
      </h2>

      <div className="flex flex-col gap-4 mb-10">
        {ANSWERS.map((a) => <AnswerCard key={a.id} answer={a} />)}
      </div>

      {/* Zone de réponse — sticky mobile */}
      <div className="sticky bottom-20 md:bottom-4 bg-card border rounded-2xl p-5 shadow-lg shadow-black/5">
        <h3 className="font-semibold mb-3">Ta réponse</h3>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Partage ta solution ou pose une précision…"
          rows={4}
          className="w-full rounded-xl border bg-background px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none transition-all"
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-muted-foreground">Markdown supporté</span>
          <Button size="sm" disabled={!reply.trim()}>Publier la réponse</Button>
        </div>
      </div>
    </>
  );
}

function AnswerCard({ answer }: { answer: typeof ANSWERS[0] }) {
  const [voted, setVoted] = useState(false);
  const [count, setCount] = useState(answer.votes);
  const [time, setTime]   = useState("");

  useEffect(() => { setTime(formatRelativeTime(answer.createdAt)); }, [answer.createdAt]);

  return (
    <div className={cn(
      "rounded-2xl border bg-card p-6",
      answer.isValidated && "border-primary shadow-md shadow-primary/8"
    )}>
      {answer.isValidated && (
        <div className="flex items-center gap-2 text-primary text-sm font-semibold mb-4">
          <span>✓</span> Réponse validée
        </div>
      )}
      <p className="text-foreground leading-relaxed whitespace-pre-line text-sm mb-5">{answer.content}</p>
      <div className="flex items-center gap-3 pt-4 border-t">
        <button
          onClick={() => { setVoted(!voted); setCount(c => voted ? c - 1 : c + 1); }}
          aria-pressed={voted}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
            voted ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary hover:text-primary"
          )}
        >
          <ChevronUp className="h-3.5 w-3.5" /> {count}
        </button>
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold">
          {getInitials(answer.author.name)}
        </span>
        <span className="text-xs text-muted-foreground">{answer.author.name} · {answer.author.city}</span>
        <span className="text-xs text-muted-foreground ml-auto" suppressHydrationWarning>{time}</span>
      </div>
    </div>
  );
}
