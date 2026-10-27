"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RegisterForm() {
  const router = useRouter();
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) router.push(`/inscription?email=${encodeURIComponent(value.trim())}`);
  };

  return (
    <div className="flex flex-col gap-4 max-w-sm mx-auto">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
        <Input
          type="email"
          placeholder="Ton adresse e-mail"
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 bg-white/10 border-white/15 text-white placeholder:text-slate-400 focus-visible:ring-primary focus-visible:border-primary rounded-xl"
          aria-label="Adresse e-mail"
        />
        <Button type="submit" className="rounded-xl shrink-0 gap-1.5">
          Rejoindre <ArrowRight className="h-4 w-4" />
        </Button>
      </form>
      <p className="text-xs text-slate-400 text-center">
        Ou{" "}
        <Link href={`/inscription${value.trim() ? `?email=${encodeURIComponent(value.trim())}` : ""}`} className="text-primary hover:underline font-medium">
          créer un compte complet
        </Link>
        {" "}en 30 secondes
      </p>
    </div>
  );
}
