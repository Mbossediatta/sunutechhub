import Link from "next/link";
import { ArrowRight, BadgeDollarSign, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminParametresPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <Card>
        <CardContent className="flex flex-col gap-4 p-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BadgeDollarSign className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-bricolage text-lg font-bold">Tarifs et paiements</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Gérez les prix par défaut, les prix par cours, les codes promotionnels
              et consultez l’historique des modifications.
            </p>
          </div>
          <Button asChild className="w-fit rounded-xl">
            <Link href="/admin/tarifs">
              Gérer les tarifs
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-start gap-4 p-6">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Settings2 className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-bricolage font-bold">Autres réglages de la plateforme</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Les réglages du profil de la plateforme et de la modération ne sont pas
              encore reliés à une API de sauvegarde. Aucun bouton de sauvegarde fictif
              n’est affiché ici ; ces options seront disponibles lorsqu’elles seront
              prises en charge côté serveur.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
