import type { Metadata } from "next";

export const metadata: Metadata = { title: "Règles de la communauté" };

const rules = [
  { n: "01", title: "Sois respectueux", body: "Traite chaque membre avec respect. Pas d'insultes, de moqueries ou d'attaques personnelles. On peut être en désaccord sans être irrespectueux." },
  { n: "02", title: "Reste sur le sujet", body: "Les questions et projets doivent être liés à l'informatique, au développement ou à la tech. Les contenus hors-sujet seront retirés." },
  { n: "03", title: "Pas de spam ni de publicité", body: "N'utilise pas Sunu Tech Hub pour promouvoir des produits ou services. Les liens vers des ressources utiles sont les bienvenus s'ils apportent une vraie valeur." },
  { n: "04", title: "Partage du contenu original", body: "Cite tes sources si tu reprends du contenu d'ailleurs. Le plagiat et la copie sans attribution sont interdits." },
  { n: "05", title: "Pas de contenu illégal", body: "Tout contenu promouvant des activités illégales, des logiciels malveillants ou portant atteinte à la vie privée est strictement interdit." },
  { n: "06", title: "Aide les débutants", body: "Tout le monde a débuté un jour. Accueille les questions des débutants avec bienveillance. Une bonne communauté grandit en aidant ses membres les plus novices." },
  { n: "07", title: "Signale, ne rétorque pas", body: "Si tu vois un contenu inapproprié, utilise le bouton Signaler. N'essaie pas de gérer toi-même le conflit." },
  { n: "08", title: "Respecte la vie privée", body: "Ne partage pas d'informations personnelles sur les autres membres sans leur consentement." },
];

export default function ReglesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <div className="mb-10">
        <p className="text-sm font-semibold text-primary mb-1">Communauté</p>
        <h1 className="font-bricolage text-3xl font-bold mb-3">Règles de la communauté</h1>
        <p className="text-muted-foreground leading-relaxed">
          Sunu Tech Hub est un espace ouvert et bienveillant. Ces règles permettent à tout le monde d&apos;apprendre et de contribuer dans de bonnes conditions.
        </p>
      </div>

      <div className="flex flex-col gap-5">
        {rules.map((r) => (
          <div key={r.n} className="flex gap-5 p-5 rounded-2xl border bg-card hover:border-primary/30 transition-colors">
            <span className="font-bricolage text-2xl font-extrabold text-primary/20 leading-none shrink-0 mt-0.5">
              {r.n}
            </span>
            <div>
              <h2 className="font-semibold text-foreground mb-1">{r.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{r.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl bg-muted/50 border p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Ces règles s&apos;appliquent à tout le contenu publié sur Sunu Tech Hub.
          Les violations répétées peuvent entraîner une suspension du compte.{" "}
          <strong className="text-foreground">Jërëjëf</strong> de les respecter 🙏
        </p>
      </div>
    </div>
  );
}
