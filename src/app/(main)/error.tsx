"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center px-4 py-20 text-center">
      <div className="h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-5">
        <AlertCircle className="h-7 w-7 text-destructive" />
      </div>
      <h2 className="font-bricolage text-xl font-bold mb-2">Une erreur est survenue</h2>
      <p className="text-muted-foreground text-sm max-w-sm mb-6 leading-relaxed">
        Quelque chose s&apos;est mal passé. Réessaie ou reviens plus tard.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Réessayer</Button>
        <Button variant="secondary" asChild>
          <a href="/">Retour à l&apos;accueil</a>
        </Button>
      </div>
    </div>
  );
}
