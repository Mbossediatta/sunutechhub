import type { Metadata } from "next";

export const metadata: Metadata = { title: "Conditions d'utilisation" };

export default function ConditionsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <div className="mb-8">
        <h1 className="font-bricolage text-3xl font-bold mb-2">Conditions d&apos;utilisation</h1>
        <p className="text-sm text-muted-foreground">Dernière mise à jour : octobre 2026</p>
      </div>

      <div className="prose prose-sm max-w-none text-foreground space-y-8">
        {[
          { title: "1. Acceptation des conditions", body: "En utilisant Sunu Tech Hub, tu acceptes ces conditions d'utilisation. Si tu n'es pas d'accord, tu ne dois pas utiliser la plateforme." },
          { title: "2. Compte utilisateur", body: "Tu es responsable de la confidentialité de tes identifiants. Tu dois avoir au moins 13 ans pour créer un compte. Un compte par personne." },
          { title: "3. Contenu publié", body: "Tu restes propriétaire du contenu que tu publies. En le publiant sur Sunu Tech Hub, tu accordes une licence non-exclusive pour l'afficher à la communauté. Tout contenu illégal, offensant ou violant les droits tiers sera supprimé." },
          { title: "4. Tarifs et accès aux cours", body: "Les tarifs des cours, des versions avancées, du passage à la version avancée et des attestations de réussite sont affichés sur la page Tarifs avant paiement. Un accès payant est limité à la durée indiquée au moment du paiement. Il n'y a pas de prélèvement automatique. Un changement de tarif ne modifie pas les paiements déjà effectués ni la période d'accès déjà payée." },
          { title: "5. Limitation de responsabilité", body: "Sunu Tech Hub fournit la plateforme en l'état. Nous ne garantissons pas l'exactitude du contenu publié par les membres. La responsabilité de Sunu Tech Hub est limitée au montant payé pour le service." },
          { title: "6. Modification des conditions", body: "Nous pouvons modifier ces conditions à tout moment. Les changements importants seront notifiés par e-mail et sur la plateforme." },
          { title: "7. Contact", body: "Pour toute question : contact@sunutechhub.sn" },
        ].map((s) => (
          <div key={s.title} className="rounded-2xl border bg-card p-6">
            <h2 className="font-semibold text-base mb-2">{s.title}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
