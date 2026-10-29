# Backend Sunu Tech Hub

API REST NestJS, PostgreSQL et Prisma pour les comptes, les cours, les tarifs,
les promotions, les paiements PayTech et les attestations de réussite.

## Prérequis

- Node.js `>= 24.15` (ou une version Node.js 22 compatible avec NestJS 12)
- npm
- PostgreSQL 16 ou plus récent

## Installation locale

1. Installer les dépendances :

   ```bash
   npm install
   ```

2. Copier `.env.example` vers `.env`, puis définir `DATABASE_URL`, une valeur
   aléatoire d’au moins 32 caractères pour `JWT_SECRET`, et les origines CORS.
3. Créer une base PostgreSQL, puis appliquer le schéma et initialiser les prix :

   ```bash
   npm run db:generate
   npm run db:deploy
   ```

4. Ajouter `ADMIN_EMAIL` et `ADMIN_PASSWORD` à `.env` pour créer le premier
   compte administrateur, puis initialiser les données :

   ```bash
   npm run db:seed
   ```

5. Démarrer l’API :

   ```bash
   npm run start:dev
   ```

`prisma.config.ts` lit la configuration depuis `.env` et déclare la commande
d’initialisation des données.

L’API écoute par défaut sur `http://localhost:4000/api`. La route
`GET /api/health` vérifie la connexion à la base de données.

Pour les déploiements, appliquer les migrations déjà créées avec
`npm run db:deploy`, puis exécuter `npm run db:seed`.

Les routes `GET /api/admin/security/overview`, `/errors`, `/operations` et
`/audit` sont réservées aux administrateurs et présentent les événements
techniques et les actions d’administration. Les événements de sécurité sont
conservés pendant 90 jours. Configurez `TRUSTED_PROXY_IPS` avec les adresses IP
exactes des reverse proxies de confiance pour enregistrer l’adresse du visiteur;
laissez cette variable vide si aucun proxy de confiance n’est utilisé.

Lorsqu’un contenu de cours est publié pour la première fois, une notification
e-mail est mise en file pour les membres dont l’inscription à ce cours est
active. L’envoi utilise la configuration SMTP et réessaie automatiquement en
cas d’échec. Dans l’espace Questions, les membres connectés peuvent aussi aimer
les réponses et y ajouter des commentaires.

## Authentification et administration

- `POST /api/auth/register` crée un compte membre à partir du nom, de l’adresse
  e-mail, du mot de passe et, facultativement, de ses centres d’intérêt.
- `POST /api/auth/login` fournit un jeton Bearer valable 15 minutes.
- `GET /api/auth/me` renvoie le compte connecté.
- `POST /api/auth/magic-link/request` envoie, si le compte existe, un lien
  unique de connexion valable 15 minutes. Le lien doit être confirmé dans le
  navigateur et ne peut être utilisé qu’une seule fois.
- `POST /api/auth/magic-link/verify` consomme le jeton et ouvre une session.
- `GET /api/auth/google/url?state=...` prépare l’autorisation Google.
- `POST /api/auth/google/callback` vérifie le code Google, crée le compte ou lie
  l’adresse Google vérifiée au compte existant sans remplacer son mot de passe.
- Toutes les routes sont protégées par défaut. Les routes publiques sont
  explicitement indiquées et les actions d’administration requièrent le rôle
  `ADMIN` stocké en base.
- Le premier administrateur est créé par la commande d’initialisation avec les
  variables `ADMIN_EMAIL` et `ADMIN_PASSWORD`. Aucun mot de passe de démonstration
  n’est intégré au code.

## Tarification

Les paramètres sont initialisés en base par `prisma/seed.ts`; les prix ne sont
pas utilisés comme valeurs de secours dans les services.

| Clé                   | Valeur initiale |
| --------------------- | --------------: |
| `prix_cours_base`     |      1 000 FCFA |
| `prix_cours_avance`   |      3 000 FCFA |
| `prix_passage_avance` |      2 000 FCFA |
| `prix_attestation`    |      2 000 FCFA |
| `duree_acces_jours`   |        30 jours |
| `devise`              |            FCFA |

- `GET /api/pricing` : paramètres publics en vigueur.
- `GET /api/admin/pricing` : valeurs et historique des changements.
- `PATCH /api/admin/pricing` : met à jour une ou plusieurs clés et enregistre
  l’administrateur, l’ancienne valeur et la nouvelle valeur.
- `GET /api/courses` et `GET /api/courses/:id` : cours et tarifs calculés depuis
  les paramètres par défaut ou les prix propres au cours.
- `POST /api/courses` : création d’un cours par un administrateur.
- `PATCH /api/courses/:id/prices` : modification des prix propres à un cours,
  avec historique des changements. Une valeur `null` rétablit le prix par défaut.
- `POST /api/courses/:id/enroll-free` : inscription sans paiement à un cours
  marqué gratuit.

Chaque paiement conserve son montant, sa devise, son objet, sa méthode et son
code promotionnel au moment de la commande. Modifier un prix ne modifie donc pas
les paiements déjà enregistrés.

## Promotions

- `GET /api/admin/promotions` : liste des codes promotionnels.
- `POST /api/admin/promotions` : crée un code à montant fixe (`FIXED`) ou en
  pourcentage (`PERCENTAGE`), avec dates de validité et limite d’utilisation
  facultative.
- `PATCH /api/admin/promotions/:id/active/:active` : active ou désactive un code.

Les réservations d’utilisation sont libérées si PayTech refuse la demande ou si
le paiement est annulé. Les réductions sont calculées uniquement lors de la
création du paiement et sont conservées dans son historique.

## Plateforme et annonces

- `GET /api/platform-settings` : nom, logo, e-mail de contact et site web publics.
- `GET /api/announcements` : annonces publiées, affichées sur le site.
- `GET /api/admin/settings` : paramètres de plateforme et annonces, réservé aux administrateurs.
- `PATCH /api/admin/settings` : met à jour le nom, le logo (URL HTTPS), l’e-mail de contact et le site web.
- `POST /api/admin/settings/announcements` : crée un brouillon d’annonce.
- `PATCH /api/admin/settings/announcements/:id` : modifie une annonce ou la publie/la masque.
- `DELETE /api/admin/settings/announcements/:id` : supprime une annonce.

La page Paramètres du frontend permet aussi à l’administrateur de modifier son nom
de profil. Les identifiants SMTP restent configurés côté serveur et ne sont pas
exposés dans l’interface.

## Inscriptions, paiement et attestations

- `POST /api/payments/checkout` : choisit une offre, recalcule le prix côté
  serveur, vérifie le code promotionnel et crée une session PayTech.
- Une version avancée remplace la base. Pour un passage depuis une inscription
  de base encore active, le prix du passage configuré est appliqué et la date de
  fin déjà payée est conservée.
- Les notifications PayTech arrivent sur `POST /api/webhooks/paytech`. Le
  backend vérifie les empreintes SHA-256 des clés API, le montant, la devise et
  la référence avant de confirmer l’inscription ou de créer une attestation.
- Si le retour PayTech indique une réussite mais que le paiement reste en
  attente, l’administrateur peut le confirmer depuis **Admin → Paiements**,
  uniquement après avoir vérifié la transaction et son montant dans le tableau
  de bord marchand PayTech. La confirmation demande le moyen et la référence
  PayTech, active l’accès correspondant et conserve l’administrateur ainsi que
  la date de vérification. La redirection du navigateur seule ne prouve jamais
  un paiement.
- `GET /api/payments/mine` et `GET /api/courses/enrollments/mine` listent
  l’historique personnel. Aucun renouvellement automatique n’est effectué.
- `GET /api/payments/:reference/receipt` télécharge le reçu PDF d’un paiement
  confirmé. `GET /api/courses/:id/progress` et
  `PATCH /api/courses/:id/progress/:contentId` consultent et mettent à jour la
  progression des contenus publiés pour un membre dont l’accès est actif.
- `POST /api/courses/:id/projects` soumet un projet. Un administrateur l’évalue
  avec `GET /api/admin/projects` et `POST /api/admin/projects/:id/review`.
- L’achat d’une attestation est refusé tant qu’un projet du membre n’est pas
  approuvé. L’inscription au cours n’a pas besoin d’être encore active.
- `GET /api/attestations/mine`, `GET /api/attestations/verify/:number` et
  `GET /api/attestations/:number/pdf` donnent accès aux attestations, à leur
  vérification publique et à leur PDF A4 paysage avec QR code. Le nom n’est
  communiqué publiquement qu’après consentement explicite.
- `PATCH /api/attestations/:number/visibility` modifie ce consentement.
- Dans son profil, le membre retrouve ses paiements et reçus, ainsi que ses
  attestations avec téléchargement PDF et page de vérification publique.
- `PATCH /api/admin/attestations/:number/revoke` retire une attestation et
  conserve le motif et l’administrateur responsable.

La mention légale figure sur le PDF et la réponse de vérification :

> Document délivré par Sunu Tech Hub. Attestation privée, non diplômante, non
> reconnue par l’État.

## Questions, événements et offres

- `GET /api/questions` et `GET /api/questions/:id` sont publics et ne renvoient
  pas les contenus masqués.
- `POST /api/questions` et `POST /api/questions/:id/answers` nécessitent une
  session membre.
- `POST /api/reports` enregistre un signalement de question ou de réponse.
- `GET /api/admin/community/questions` et
  `GET /api/admin/community/reports` sont réservés aux administrateurs.
- `POST /api/admin/community/reports/:id/review` traite un signalement et peut
  masquer sa cible.
- `GET /api/events` affiche les événements actifs à venir. Les membres
  connectés s’inscrivent avec `POST /api/events/:id/register`.
- `GET /api/admin/events`, `POST /api/admin/events` et
  `PATCH /api/admin/events/:id` permettent de gérer les événements.
- `GET /api/jobs` n’affiche que les offres publiées. Les administrateurs
  gèrent les offres avec `GET /api/admin/jobs`, `POST /api/admin/jobs` et
  `PATCH /api/admin/jobs/:id/review`.

Après avoir mis à jour le code, générer le client Prisma et appliquer la
migration additive `20261027130000_community_content` avec `npm run db:generate`
puis `npm run db:deploy`. Cette migration ajoute les tables communautaires sans
réinitialiser ni supprimer les données existantes.

## Connexion Google

Dans Google Cloud Console, active l’API Google Identity, configure l’écran de
consentement OAuth puis crée un identifiant client de type « Application Web ».
Ajoute `http://localhost:3000/api/auth/google/callback` comme URI de
redirection autorisée. Copie le Client ID et le Client Secret uniquement dans
`GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` du `.env` du backend. En
production, configure l’URI HTTPS réelle et la même adresse dans
`FRONTEND_URL`. Ne place jamais le Client Secret dans le frontend.

Le parcours utilise un état OAuth aléatoire lié à un cookie HTTP-only. Le
backend vérifie l’adresse e-mail auprès de Google avant de créer le compte ou
de l’associer à un compte existant.
Si Google signale une erreur de redirection, compare cette URI caractère par
caractère avec celle de `FRONTEND_URL` suivie de
`/api/auth/google/callback`, puis redémarre le backend après toute modification
de ses variables d’environnement.

## E-mails de bienvenue et liens magiques

Configurez `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`,
`SMTP_PASSWORD` (ou l’ancien nom `SMTP_PASS`) et `SMTP_FROM` dans `backend/.env`. Après une inscription, la
page confirme la création du compte et indique si l’e-mail de bienvenue a été
envoyé. Le lien magique reste une option de connexion distincte du mot de passe;
son jeton est à usage unique, stocké sous forme hachée et expire après
15 minutes. L’API limite les demandes afin de réduire les abus.

## PayTech et reçus

Les clés PayTech restent exclusivement côté serveur. Renseigner
`PAYTECH_API_KEY`, `PAYTECH_API_SECRET`, `PAYTECH_ENV`, `PAYTECH_PUBLIC_API_URL`
et `FRONTEND_URL`. Après chaque modification du `.env`, redémarrer le backend
pour charger les nouvelles valeurs. Dans l’administration, la page **Paiements**
affiche un diagnostic de configuration sans révéler les clés.

`PAYTECH_PUBLIC_API_URL` et `FRONTEND_URL` doivent être des adresses publiques
en HTTPS : PayTech ne peut pas atteindre `localhost`. En développement, si un
seul tunnel est disponible, faire pointer son URL vers le frontend sur le port
3000 et définir les deux variables avec cette même URL. Le frontend relaie
alors `/api/webhooks/paytech` vers le backend configuré par `BACKEND_API_URL`.
Avec deux tunnels, `PAYTECH_PUBLIC_API_URL` peut pointer directement vers le
backend sur le port 4000 et `FRONTEND_URL` vers le frontend sur le port 3000.
Après modification, redémarrer le backend et vérifier que le tunnel pointe vers
le bon port. L’application appelle l’endpoint de paiement PayTech et redirige
vers sa page de paiement Wave ou Orange Money. Les URL de retour sont
`<FRONTEND_URL>/paiement/succes` et `<FRONTEND_URL>/paiement/annule`.

La page de retour ne confirme jamais un paiement par elle-même : elle interroge
le statut enregistré, qui n’est mis à jour qu’après validation de la
notification PayTech. Le mode `test` est réservé aux essais internes : selon la
documentation PayTech, il peut débiter un montant aléatoire compris entre 100 et
150 FCFA. Ne réalisez un essai PayTech qu’en sachant que ce débit éventuel est
possible. L’environnement `prod` nécessite l’activation du compte marchand.

Les reçus sont placés dans une boîte d’envoi transactionnelle en base après
confirmation du paiement. Configurez `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`,
`SMTP_USER`, `SMTP_PASSWORD` et `SMTP_FROM` pour que le traitement automatique
les expédie. Le courriel présente un récapitulatif HTML et joint le même reçu
PDF professionnel que celui téléchargeable dans le profil membre. Tant que SMTP
n’est pas configuré, les reçus restent en attente et un avertissement apparaît
dans les journaux.
Un rappel de renouvellement est envoyé sans prélèvement automatique environ
trois jours avant l’échéance, à 9 h (heure de Dakar).

## Sécurité

- Validation des entrées, rejet des propriétés inconnues, limitation de débit,
  Helmet et CORS par liste d’origines.
- Mots de passe hachés avec bcrypt; rôles relus en base à chaque requête.
- Aucun paiement n’est marqué réussi automatiquement sur la base de la seule
  redirection du navigateur : la confirmation automatique nécessite la
  notification PayTech vérifiée. Une confirmation manuelle est réservée à
  l’administration et exige une vérification préalable dans PayTech.
- Les identifiants, secrets JWT, clés PayTech et mots de passe SMTP doivent être
  fournis par l’environnement et ne doivent jamais être commités.

## Vérification

```bash
npm run build
npm test
npm run lint
```

La configuration de la base de production, les secrets PayTech/SMTP et la mise
en ligne restent à effectuer dans l’environnement de déploiement.
