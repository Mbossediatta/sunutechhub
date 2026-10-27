"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronUp, MessageSquare, CheckCircle2, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, formatRelativeTime } from "@/lib/utils";

interface QuestionCardProps {
  id: string;
  title: string;
  excerpt?: string;
  votes: number;
  answers: number;
  views?: number;
  subjects: string[];
  author: { name: string; city: string };
  createdAt: string;
  solved?: boolean;
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

export function QuestionCard({
  id, title, excerpt, votes, answers, views,
  subjects, author, createdAt, solved,
}: QuestionCardProps) {
  const [voted, setVoted] = useState(false);
  const [count, setCount] = useState(votes);
  const [relTime, setRelTime] = useState("");

  useEffect(() => {
    setRelTime(formatRelativeTime(createdAt));
  }, [createdAt]);

  return (
    <article className="group flex gap-4 rounded-2xl border bg-card p-5 transition-all duration-200 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5">

      {/* ── Vote ── */}
      <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
        <button
          onClick={() => { setVoted(!voted); setCount(c => voted ? c - 1 : c + 1); }}
          aria-pressed={voted}
          aria-label={`${voted ? "Retirer mon vote" : "Voter"} (${count})`}
          className={cn(
            "flex flex-col items-center justify-center w-10 h-12 rounded-xl border transition-all duration-150 active:scale-95",
            voted
              ? "bg-primary border-primary text-primary-foreground shadow-md shadow-primary/20"
              : "bg-muted border-transparent text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-primary/5"
          )}
        >
          <ChevronUp className={cn("h-4 w-4", voted && "stroke-[2.5]")} />
          <span className="text-xs font-bold leading-none">{count}</span>
        </button>
      </div>

      {/* ── Contenu ── */}
      <div className="flex-1 min-w-0">
        <Link href={`/questions/${id}`} className="block mb-1.5">
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors duration-150 line-clamp-2 leading-snug text-[15px]">
            {title}
          </h3>
        </Link>

        {excerpt && (
          <p className="text-sm text-muted-foreground line-clamp-1 mb-3 leading-relaxed">
            {excerpt}
          </p>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {solved && (
            <Badge variant="default" className="gap-1 text-xs">
              <CheckCircle2 className="h-3 w-3" /> Résolu
            </Badge>
          )}
          {subjects.map((s) => (
            <Badge key={s} variant="outline" className="text-xs hover:border-primary hover:text-primary transition-colors cursor-pointer">
              {s}
            </Badge>
          ))}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <MessageSquare className="h-3.5 w-3.5" />
            {answers} réponse{answers !== 1 ? "s" : ""}
          </span>
          {views && (
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {views}
            </span>
          )}
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[9px] font-bold shrink-0">
              {getInitials(author.name)}
            </span>
            <span className="hidden sm:inline">{author.name} · </span>
            <span suppressHydrationWarning>{relTime}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
