// ⚠️ Données d'exemple — remplacer par l'API réelle

export const mockQuestions = [
  {
    id: "1",
    title: "Comment créer une API REST avec Node.js et Express ?",
    excerpt: "Je débute avec Node.js et je veux construire une API pour mon application mobile. Quelle est la meilleure façon d'organiser les routes et les contrôleurs ?",
    votes: 42, answers: 8, views: 312,
    subjects: ["Node.js", "API", "Express"],
    author: { name: "Moussa Diallo", city: "Dakar" },
    createdAt: "2026-10-07T16:00:00.000Z",
    solved: true,
  },
  {
    id: "2",
    title: "Différence entre useState et useReducer dans React ?",
    excerpt: "Je comprends useState pour les états simples, mais quand est-ce qu'on doit préférer useReducer ? Y a-t-il un seuil de complexité ?",
    votes: 28, answers: 5, views: 198,
    subjects: ["React", "JavaScript"],
    author: { name: "Fatou Sow", city: "Saint-Louis" },
    createdAt: "2026-10-07T13:00:00.000Z",
    solved: false,
  },
  {
    id: "3",
    title: "Comment configurer PostgreSQL sur Ubuntu 22.04 ?",
    excerpt: "J'ai un VPS avec Ubuntu 22.04 et j'essaie d'installer PostgreSQL. L'installation se passe bien mais je n'arrive pas à me connecter.",
    votes: 19, answers: 3, views: 145,
    subjects: ["PostgreSQL", "Linux"],
    author: { name: "Ibrahima Ndiaye", city: "Thiès" },
    createdAt: "2026-10-06T18:00:00.000Z",
    solved: true,
  },
  {
    id: "4",
    title: "Comment intégrer le paiement Wave dans une app Next.js ?",
    excerpt: "Je veux permettre à mes utilisateurs de payer via Wave. Est-ce qu'il y a une documentation officielle pour l'intégration avec Next.js ?",
    votes: 35, answers: 2, views: 267,
    subjects: ["Next.js", "Wave", "Paiement"],
    author: { name: "Aissatou Bah", city: "Dakar" },
    createdAt: "2026-10-04T10:00:00.000Z",
    solved: false,
  },
];

export const mockCourses = [
  {
    id: "1",
    title: "Les bases du développement web",
    description: "HTML, CSS et JavaScript pour bien démarrer. Du zéro à ta première page web.",
    level: "Débutant", duration: "8h", language: "Français",
    progress: 65, lessons: 24, enrolled: 1240,
    subjects: ["HTML", "CSS", "JavaScript"],
  },
  {
    id: "2",
    title: "React — De zéro à professionnel",
    description: "Hooks, composants, state management et bonnes pratiques React modernes.",
    level: "Intermédiaire", duration: "14h", language: "Français",
    progress: 30, lessons: 42, enrolled: 876,
    subjects: ["React", "JavaScript"],
  },
  {
    id: "3",
    title: "Python pour les débutants",
    description: "Variables, boucles, fonctions et premiers projets. En français et wolof.",
    level: "Débutant", duration: "6h", language: "Français + Wolof",
    progress: 0, lessons: 18, enrolled: 2100,
    subjects: ["Python"],
  },
  {
    id: "4",
    title: "Bases de données avec PostgreSQL",
    description: "SQL, modélisation, requêtes complexes et optimisation de performances.",
    level: "Intermédiaire", duration: "10h", language: "Français",
    progress: 0, lessons: 30, enrolled: 634,
    subjects: ["PostgreSQL", "SQL"],
  },
];

export const mockProjects = [
  {
    id: "1",
    title: "SenShop — E-commerce pour artisans sénégalais",
    description: "Application mobile qui permet aux artisans de Dakar de vendre leurs créations directement aux clients locaux et de la diaspora.",
    author: { name: "Cheikh Mbaye", city: "Dakar" },
    technologies: ["Flutter", "Firebase"],
    feedback: 14,
  },
  {
    id: "2",
    title: "DiasporConnect — Transfert d'argent simplifié",
    description: "Interface web pour la diaspora sénégalaise qui veut envoyer de l'argent à leurs familles via Wave et Orange Money.",
    author: { name: "Rokhaya Dieng", city: "Thiès" },
    technologies: ["React", "Node.js", "PayTech"],
    feedback: 8,
  },
  {
    id: "3",
    title: "EduSen — Suivi de présence scolaire",
    description: "Système de gestion des présences pour les écoles primaires avec SMS automatiques aux parents absents.",
    author: { name: "Oumar Faye", city: "Ziguinchor" },
    technologies: ["Next.js", "PostgreSQL"],
    feedback: 22,
  },
];

export type EventType = "Présentiel" | "En ligne";

export const mockEvents: Array<{
  id: string; title: string; date: string;
  location: string; type: EventType;
  registered: number; capacity: number;
}> = [
  {
    id: "1", title: "Meetup Dev Dakar #12",
    date: "2026-10-14T18:00:00.000Z",
    location: "Dakar — Espace Cosmos, Almadies",
    type: "Présentiel", registered: 48, capacity: 80,
  },
  {
    id: "2", title: "Atelier Flutter — Applications mobiles en 2h",
    date: "2026-10-21T18:00:00.000Z",
    location: "En ligne (Zoom)",
    type: "En ligne", registered: 32, capacity: 50,
  },
  {
    id: "3", title: "Hackathon SenTech 2026",
    date: "2026-11-07T08:00:00.000Z",
    location: "Saint-Louis — UGBL Campus",
    type: "Présentiel", registered: 120, capacity: 200,
  },
];

export const mockJobs = [
  {
    id: "1", title: "Développeur React Junior",
    company: "Gainde Digital", city: "Dakar",
    type: "Emploi", level: "Junior",
    posted: "2026-10-05T10:00:00.000Z",
  },
  {
    id: "2", title: "Stage — Développement mobile Flutter",
    company: "Wari Tech", city: "Dakar",
    type: "Stage", level: "Débutant",
    posted: "2026-10-02T10:00:00.000Z",
  },
  {
    id: "3", title: "Mission freelance — Création site web",
    company: "Ets Touré & Frères", city: "Thiès",
    type: "Mission", level: "Intermédiaire",
    posted: "2026-10-06T10:00:00.000Z",
  },
];
