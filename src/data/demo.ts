/**
 * ⚠️ DONNÉES DE DÉMONSTRATION — fichier central.
 * Tout ce qui est affiché dans la V1 provient d'ici : dates, personnes,
 * artistes et lieux sont FICTIFS. Aucune donnée réelle, aucun service connecté.
 */

export type NewsCategory = "artists" | "travel" | "program";

/** true = affiche « visuel provisoire » sur les photos de travail (désactivé : photos authentiques fournies). */
export const PLACEHOLDER_PHOTOS = false;

export const brand = {
  /**
   * Logos officiels fournis (PNG dérivés du fichier original noir sur blanc : fond rendu transparent, couleur Cloud White ;
   * le mot est un simple rognage de l'emblème). À remplacer par les SVG officiels dès qu'ils existent.
   * Si absent : emplacement identifié — jamais de logo recréé.
   */
  wordmarkSrc: "/brand/skyline-wordmark-white.png" as string | undefined,
  wordmarkRatio: 931 / 156,
  emblemSrc: "/brand/skyline-emblem-white.png" as string | undefined,
  emblemRatio: 1102 / 1171,
};

export const DEMO_NOTICE = "Données de démonstration — contenus fictifs";

export const event = {
  name: "SKYLINE IBIZA",
  year: 2027,
  /** Date fictive du décollage. Modifiable : toute ISO 8601 valide. */
  departureISO: "2027-06-18T08:00:00+02:00",
  /** Fin fictive de l'édition : sert aux ambiances « pendant » / « après ». */
  endISO: "2027-06-20T23:00:00+02:00",
  tagline: "LA FÊTE COMMENCE À 10 000 MÈTRES.",
  signature: "THE JOURNEY NEVER ENDS.",
};

export const user = {
  firstName: "Alex",
  fullName: "Alex Martin",
  memberLine: "Membre SKYLINE 2027",
  notifications: [
    { id: "n1", title: "Bienvenue à bord", body: "Ton profil de démonstration est prêt.", time: "Il y a 2 h" },
    { id: "n2", title: "Checklist mise à jour", body: "Deux nouvelles étapes de préparation.", time: "Hier" },
    { id: "n3", title: "Nouvel artiste annoncé", body: "Un premier nom rejoint la line-up (fictif).", time: "Il y a 3 j" },
  ],
};

/** Photographies authentiques de la première édition (fournies par SKYLINE). */
export const images = {
  before: "/photos/window-sunset.jpg",
  during: "/photos/crowd-joy.jpg",
  after: "/photos/stairs-night.jpg",
  dj: "/photos/dj-set.jpg",
  airport: "/photos/ibiza-airport.jpg",
  aisle: "/photos/cabin-aisle.jpg",
  champagne: "/photos/champagne.jpg",
  motion: "/photos/cabin-motion.jpg",
};

export const experience = {
  eyebrow: "SKYLINE EXPERIENCE",
  title: "LE DJ SET DANS L'AVION",
  teaser: "Un DJ set live en plein vol, avant deux jours de musique à Ibiza.",
  cta: "Découvrir le concept",
  image: images.dj,
  concept: {
    intro:
      "SKYLINE transforme le trajet en première nuit de fête : un vol dédié, une cabine pensée comme un club et un DJ set live au-dessus des nuages.",
    pillars: [
      { id: "p1", icon: "plane", title: "Le vol", text: "Un avion réservé aux participants, du décollage à l'atterrissage à Ibiza." },
      { id: "p2", icon: "music", title: "Le DJ set", text: "Un set électro en altitude, pensé pour la cabine : son, lumière, ambiance." },
      { id: "p3", icon: "sun", title: "Deux jours à Ibiza", text: "Deux journées de musique sur l'île, programmation à dévoiler." },
      { id: "p4", icon: "users", title: "La communauté", text: "Un groupe privé, et un club réservé aux anciens participants." },
    ],
    footnote: "Description de démonstration — le programme final sera communiqué ultérieurement.",
  },
};

export type NewsItem = {
  id: string;
  category: NewsCategory;
  tag: string;
  title: string;
  excerpt: string;
  body: string[];
  date: string;
  image?: string;
};

export const newsFilters: { id: "all" | NewsCategory; label: string }[] = [
  { id: "all", label: "Tout" },
  { id: "artists", label: "Artistes" },
  { id: "travel", label: "Voyage" },
  { id: "program", label: "Programme" },
];

export const news: NewsItem[] = [
  {
    id: "u1", category: "artists", tag: "ARTISTES", date: "12 oct.",
    title: "Nouvel artiste bientôt dévoilé",
    excerpt: "Restez connectés…",
    body: ["Une première annonce de line-up est en préparation.", "Contenu de démonstration : aucun artiste n'est confirmé."],
  },
  {
    id: "u2", category: "travel", tag: "VOYAGE", date: "10 oct.",
    title: "Bagages : ce qu'il faut savoir",
    excerpt: "Cabine et accessoire personnel.",
    body: ["Exemple de consigne de voyage : un bagage cabine et un accessoire personnel.", "Les règles réelles seront publiées avec la phase de réservation."],
    image: images.aisle,
  },
  {
    id: "u3", category: "artists", tag: "ARTISTES", date: "6 oct.",
    title: "Line-up : les prochaines annonces",
    excerpt: "Les noms seront dévoilés progressivement.",
    body: ["Le calendrier des annonces sera communiqué dans l'app.", "Contenu de démonstration."],
  },
  {
    id: "u4", category: "travel", tag: "VOYAGE", date: "2 oct.",
    title: "France → Ibiza : départ à préciser",
    excerpt: "Le lieu de rendez-vous sera annoncé.",
    body: ["L'aéroport et l'horaire de départ ne sont pas encore définis.", "Aucune réservation n'est possible dans cette version."],
    image: images.airport,
  },
];

export type CrewMember = {
  id: string; name: string; role: string; city: string; hue: number; bio: string; seat: string;
};

export const crew = {
  name: "Crew Alpha",
  members: [
    { id: "m1", name: "Lina Moreau", role: "Capitaine du crew", city: "Paris", hue: 18, seat: "12A", bio: "Fan de house mélodique. Profil fictif." },
    { id: "m2", name: "Théo Bernard", role: "Playlist officielle", city: "Lyon", hue: 215, seat: "12B", bio: "Gère la playlist du groupe. Profil fictif." },
    { id: "m3", name: "Sara Haddad", role: "Photo & vidéo", city: "Marseille", hue: 330, seat: "12C", bio: "Toujours un appareil à la main. Profil fictif." },
    { id: "m4", name: "Noé Petit", role: "Logistique", city: "Bordeaux", hue: 150, seat: "13A", bio: "Connaît tous les horaires. Profil fictif." },
    { id: "m5", name: "Yuna Kato", role: "Danse", city: "Lille", hue: 45, seat: "13B", bio: "Première sur la piste. Profil fictif." },
  ] satisfies CrewMember[],
};

export type NavId = "home" | "flight" | "explore" | "club";

/** Informations pratiques, conservées de la V1 sous forme discrète (profil). Démo — pas un conseil officiel. */
export const practicalInfo = [
  { id: "i1", title: "Documents de voyage", text: "Une pièce d'identité en cours de validité est requise pour voyager. Les exigences exactes dépendent de l'itinéraire et seront confirmées." },
  { id: "i2", title: "Départ", text: "France → Ibiza. L'aéroport et l'horaire seront communiqués par SKYLINE une fois confirmés." },
  { id: "i3", title: "Pass SKYLINE", text: "Le pass événementiel SKYLINE n'est pas un titre de transport et ne remplace pas la carte d'embarquement de la compagnie aérienne." },
];

export const profileLinks = {
  help: "Contact et assistance : disponibles avec la phase de réservation. Aucune adresse réelle n'est affichée dans cette démo.",
  about: "SKYLINE est une expérience de musique électronique et de voyage vers Ibiza. THE JOURNEY NEVER ENDS.",
};

/** Écrans temporaires (V2 : seul HOME est conçu). `needs` = contenus qui devront être fournis. */
export const placeholders: Record<Exclude<NavId, "home" | "explore">, {
  title: string; subtitle: string; icon: string; image: string; upcoming: string[]; note?: string;
}> = {
  flight: {
    title: "MY FLIGHT", subtitle: "Votre accès SKYLINE.", icon: "plane", image: images.aisle,
    upcoming: ["Pass digital SKYLINE", "Réservation confirmée", "Détails de départ vérifiés", "Documents essentiels"],
    note: "Le pass SKYLINE n'est pas un titre de transport : il ne remplace pas la carte d'embarquement de la compagnie aérienne.",
  },
  club: {
    title: "SKYLINE CLUB", subtitle: "THE JOURNEY NEVER ENDS.", icon: "club", image: images.champagne,
    upcoming: ["Carte de membre", "Historique de participation", "Archives photo et vidéo officielles", "Contenus exclusifs"],
  },
};

/** SKYLINE SIGNAL — révélations privées. Contenus de DÉMONSTRATION : aucun artiste, lieu ou mix n'est réel. */
export type SignalKind = "artist" | "venue" | "mix" | "video" | "partner";
export type Signal = {
  id: string; kind: SignalKind; kindLabel: string; title: string; teaser: string; body: string[]; date: string;
  /** Orange = révélations musicales ; bleu ciel = le reste. */
  tone: "sunset" | "sky"; mediaSlot: string; media?: string;
};
export const signals: Signal[] = [
  {
    id: "s1", kind: "artist", kindLabel: "Artiste", tone: "sunset", date: "24 oct.",
    title: "Un premier nom rejoint la line-up",
    teaser: "Un contenu privé vous attend.",
    body: ["Ici s'afficherait l'annonce officielle d'un artiste, réservée aux membres avant sa diffusion publique.", "Contenu de démonstration : aucun artiste n'est confirmé."],
    mediaSlot: "Portrait officiel de l'artiste · 4:5",
  },
  {
    id: "s2", kind: "venue", kindLabel: "Lieu", tone: "sky", date: "17 oct.",
    title: "Un lieu à Ibiza se dévoile",
    teaser: "Première révélation de la programmation.",
    body: ["Ici s'afficherait la révélation d'un lieu de l'édition.", "Contenu de démonstration : aucun lieu n'est confirmé."],
    mediaSlot: "Photo officielle du lieu · 4:5", media: images.airport,
  },
  {
    id: "s3", kind: "mix", kindLabel: "Mix exclusif", tone: "sunset", date: "9 oct.",
    title: "Un mix à écouter avant le départ",
    teaser: "Disponible uniquement pour les membres.",
    body: ["Ici s'afficherait un mix exclusif autorisé par l'artiste et le diffuseur.", "Contenu de démonstration : aucun média n'est intégré."],
    mediaSlot: "Visuel officiel du mix · 1:1", media: images.motion,
  },
];
