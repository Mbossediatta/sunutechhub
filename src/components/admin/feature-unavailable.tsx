import { Info } from "lucide-react";

export function AdminFeatureUnavailable({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-6 sm:p-8">
      <span className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Info className="h-5 w-5" />
      </span>
      <h2 className="font-bricolage text-lg font-bold">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      <p className="mt-4 text-xs text-muted-foreground">
        Cette section sera activée quand son modèle de données et ses routes sécurisées
        seront implémentés. Aucune modification n’est actuellement enregistrée depuis
        cet écran.
      </p>
    </div>
  );
}
