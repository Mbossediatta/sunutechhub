import type { Metadata } from "next";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function ConfidentialitePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <div className="mb-8">
        <h1 className="font-bricolage text-3xl font-bold mb-2">Politique de confidentialité</h1>
        <p className="text-sm text-muted-foreground">Dernière mise à jour : octobre 2026</p>
      </div>

      <div className="flex flex-col gap-4">
        {[
          { title: "Données collectées", body: "Nous collectons : ton adresse e-mail ou numéro de téléphone, ton nom, ta ville, le contenu que tu publies (questions, réponses, projets), et des données d'utilisation anonymisées (pages visitées, fonctionnalités utilisées)." },
          { title: "Utilisation des données", body: "Tes données sont utilisées pour faire fonctionner ton compte, t'envoyer les notifications liées à tes services, améliorer la plateforme et traiter les paiements de cours et d'attestations. Les annonces et informations sur les événements ne sont envoyées qu'aux personnes ayant choisi de s'abonner à la newsletter, avec ou sans compte. Cet abonnement est facultatif et résiliable à tout moment depuis ton profil ou le lien présent dans chaque e-mail. Nous ne vendons jamais tes données." },
          { title: "Cookies", body: "Nous utilisons des cookies essentiels (session, préférences) et des cookies analytiques anonymisés via Plausible/Umami. Pas de cookies publicitaires tiers." },
          { title: "Partage avec des tiers", body: "Nous partageons tes données uniquement avec : nos prestataires de paiement (PayTech pour Wave/Orange Money), notre hébergeur. Aucune donnée n'est vendue à des tiers commerciaux." },
          { title: "Tes droits", body: "Tu peux à tout moment : consulter tes données, les modifier depuis ton profil, demander leur suppression en nous écrivant à contact@sunutechhub.sn. Les données sont supprimées sous 30 jours." },
          { title: "Sécurité", body: "Les mots de passe sont chiffrés (bcrypt). Les communications sont sécurisées (HTTPS). Nous ne stockons jamais les données de carte bancaire." },
          { title: "Contact", body: "Pour toute question sur tes données : contact@sunutechhub.sn — nous répondons sous 48 heures." },
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
