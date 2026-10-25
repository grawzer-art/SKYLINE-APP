/**
 * ⚠️ DONNÉES DE DÉMONSTRATION — fichier central.
 * Tout ce qui est affiché dans la V1 provient d'ici : dates, personnes,
 * artistes et lieux sont FICTIFS. Aucune donnée réelle, aucun service connecté.
 */

export type NewsCategory = "artists" | "travel" | "program";

/** true tant que les photos officielles ne sont pas fournies : affiche « visuel provisoire ». */
export const PLACEHOLDER_PHOTOS = true;

/** Wordmark officiel : renseigner le chemin du SVG fourni (ex. "/brand/skyline-wordmark.svg"). Sinon substitut typographique. */
export const brand = { wordmarkSrc: undefined as string | undefined };

export const DEMO_NOTICE = "Données de démonstration — contenus fictifs";

export const event = {
  name: "SKYLINE IBIZA",
  year: 2027,
  /** Date fictive du décollage. Modifiable : toute ISO 8601 valide. */
  departureISO: "2027-06-18T08:00:00+02:00",
  tagline: "LA FÊTE COMMENCE À 10 000 MÈTRES.",
  signature: "THE JOURNEY NEVER ENDS.",
};

export const user = {
  firstName: "Alex",
  initials: "AM",
  passLabel: "Participant · Démo",
  notifications: [
    { id: "n1", title: "Bienvenue à bord", body: "Ton profil de démonstration est prêt.", time: "Il y a 2 h" },
    { id: "n2", title: "Checklist mise à jour", body: "Deux nouvelles étapes de préparation.", time: "Hier" },
    { id: "n3", title: "Nouvel artiste annoncé", body: "Un premier nom rejoint la line-up (fictif).", time: "Il y a 3 j" },
  ],
};

export const images = {
  hero: "/images/hero.jpg",
  experience: "/images/experience.jpg",
  sunset: "/images/sunset.jpg",
  day: "/images/day.jpg",
  night: "/images/night.jpg",
};

export const experience = {
  eyebrow: "SKYLINE EXPERIENCE",
  title: "LE DJ SET DANS L'AVION",
  teaser: "Un DJ set live en plein vol, avant deux jours de musique à Ibiza.",
  cta: "Découvrir le concept",
  image: images.experience,
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
    image: images.night,
  },
  {
    id: "u2", category: "travel", tag: "VOYAGE", date: "10 oct.",
    title: "Bagages : ce qu'il faut savoir",
    excerpt: "Cabine et accessoire personnel.",
    body: ["Exemple de consigne de voyage : un bagage cabine et un accessoire personnel.", "Les règles réelles seront publiées avec la phase de réservation."],
    image: images.day,
  },
  {
    id: "u3", category: "artists", tag: "ARTISTES", date: "6 oct.",
    title: "Line-up : les prochaines annonces",
    excerpt: "Les noms seront dévoilés progressivement.",
    body: ["Le calendrier des annonces sera communiqué dans l'app.", "Contenu de démonstration."],
    image: images.sunset,
  },
  {
    id: "u4", category: "travel", tag: "VOYAGE", date: "2 oct.",
    title: "France → Ibiza : départ à préciser",
    excerpt: "Le lieu de rendez-vous sera annoncé.",
    body: ["L'aéroport et l'horaire de départ ne sont pas encore définis.", "Aucune réservation n'est possible dans cette version."],
  },
];

export type ChecklistItem = { id: string; label: string; icon: string };

export const checklist: ChecklistItem[] = [
  { id: "c1", label: "Pièce d'identité à vérifier", icon: "idcard" },
  { id: "c2", label: "Bagage cabine", icon: "luggage" },
  { id: "c3", label: "Rejoindre mon crew", icon: "users" },
  { id: "c4", label: "Tenue de vol", icon: "shirt" },
  { id: "c5", label: "Casque et batterie externe", icon: "headphones" },
  { id: "c6", label: "Activer les mises à jour (bientôt)", icon: "bell" },
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

export type NavId = "home" | "pass" | "explore" | "club" | "more";

export const placeholders: Record<Exclude<NavId, "home">, {
  title: string; subtitle: string; icon: string; image: string; upcoming: string[];
}> = {
  pass: {
    title: "MY PASS", subtitle: "Ton espace participant.", icon: "ticket", image: images.night,
    upcoming: ["Documents de voyage", "Informations d'embarquement", "Réservations"],
  },
  explore: {
    title: "EXPLORE", subtitle: "Ibiza, du ciel à la plage.", icon: "compass", image: images.sunset,
    upcoming: ["Programme jour par jour", "Lieux et adresses", "Line-up complète"],
  },
  club: {
    title: "SKYLINE CLUB", subtitle: "THE JOURNEY NEVER ENDS.", icon: "club", image: images.day,
    upcoming: ["Archives des éditions", "Espace anciens participants", "Événements privés"],
  },
  more: {
    title: "MORE", subtitle: "Réglages et informations.", icon: "more", image: images.experience,
    upcoming: ["Profil", "Aide & contact", "À propos de SKYLINE"],
  },
};
