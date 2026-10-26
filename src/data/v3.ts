/**
 * PROTOTYPE V3 — données FICTIVES, uniquement pour valider le parcours UX.
 * Règles : aucun membre réel, aucune photo de personne, aucune programmation / information de vol inventée.
 * Les champs « officiels » sont des emplacements (« à renseigner par l'équipe »).
 */
export type Phase = "before" | "during" | "after";
export const phaseLabels: Record<Phase, string> = { before: "Avant", during: "Pendant Ibiza", after: "Après" };

export const cities = ["Paris", "Lyon", "Marseille", "Bordeaux", "Lille", "Nantes", "Toulouse", "Bruxelles", "Genève"] as const;
export const genres = ["House", "Deep house", "Melodic", "Techno", "Afro house", "Disco", "Electro", "Organic"] as const;

export type Member = { id: string; pseudo: string; city: string; genres: string[]; bio: string; visible: boolean };
export const members: Member[] = [
  { id: "m1", pseudo: "Alba", city: "Paris", genres: ["House", "Melodic"], bio: "Toujours au premier rang des sets au coucher du soleil.", visible: true },
  { id: "m2", pseudo: "Noé", city: "Lyon", genres: ["Techno", "Electro"], bio: "Collectionne les vinyles et les levers de soleil.", visible: true },
  { id: "m3", pseudo: "Maëlys", city: "Marseille", genres: ["Afro house", "Deep house"], bio: "Voyage léger, danse beaucoup.", visible: true },
  { id: "m4", pseudo: "Sacha", city: "Paris", genres: ["Disco", "House"], bio: "Playlist de route en continu.", visible: true },
  { id: "m5", pseudo: "Inès", city: "Bordeaux", genres: ["Melodic", "Organic"], bio: "Première édition, curieuse de tout.", visible: true },
  { id: "m6", pseudo: "Tom", city: "Lille", genres: ["Techno"], bio: "Ici pour la musique avant tout.", visible: true },
  { id: "m7", pseudo: "Zoé", city: "Bruxelles", genres: ["Deep house", "Disco"], bio: "Cherche des partenaires pour les after.", visible: true },
  { id: "m8", pseudo: "Léo", city: "Nantes", genres: ["Electro", "House"], bio: "Photographe amateur.", visible: true },
  // Profils qui n'ont PAS accepté d'être visibles : n'apparaissent jamais dans l'annuaire.
  { id: "h1", pseudo: "Profil privé", city: "—", genres: [], bio: "", visible: false },
  { id: "h2", pseudo: "Profil privé", city: "—", genres: [], bio: "", visible: false },
];

export type ChatMsg = { from: "me" | "them"; text: string; t: string };
/** Conversations existantes (contacts déjà acceptés). */
export const seedMessages: Record<string, ChatMsg[]> = {
  m1: [
    { from: "them", text: "Salut ! On se retrouve au départ ?", t: "Hier" },
    { from: "me", text: "Avec plaisir. Tu viens de Paris aussi ?", t: "Hier" },
  ],
  m2: [{ from: "them", text: "Ravi de te lire ici. Tu écoutes quoi en ce moment ?", t: "Lun." }],
};
/** Demandes de contact reçues. */
export const seedIncoming: Record<string, "pending"> = { m3: "pending" };

export const radio = {
  selections: [
    { id: "r1", title: "Sélection officielle · Avant le départ", by: "SKYLINE", slot: "Visuel officiel · 1:1" },
    { id: "r2", title: "Sélection officielle · Coucher de soleil", by: "SKYLINE", slot: "Visuel officiel · 1:1" },
  ],
  djs: [
    { id: "d1", name: "DJ à confirmer", note: "Profil officiel à venir", slot: "Portrait officiel · 4:5" },
    { id: "d2", name: "DJ à confirmer", note: "Profil officiel à venir", slot: "Portrait officiel · 4:5" },
  ],
  mixes: [
    { id: "x1", title: "Mix exclusif à confirmer", by: "DJ à confirmer", slot: "Pochette officielle · 1:1" },
    { id: "x2", title: "Mix exclusif à confirmer", by: "DJ à confirmer", slot: "Pochette officielle · 1:1" },
  ],
};

/** Plan des écrans du prototype (sert à /v3/screens). */
export type ScreenNode = { label: string; href: string; note?: string; children?: ScreenNode[] };
export const sitemap: ScreenNode[] = [
  { label: "HOME", href: "/v3", note: "Émotion · SKYLINE NOW (pendant) · SKYLINE SIGNAL", children: [
    { label: "SKYLINE SIGNAL (révélation plein écran)", href: "/signal/un-lieu-a-ibiza-se-devoile", note: "Existant en production" },
  ] },
  { label: "MY FLIGHT", href: "/v3/flight", note: "Pass · réservation · informations officielles · programme pratique" },
  { label: "EXPLORE", href: "/v3/explore", note: "Artistes · lineup · contenus", children: [
    { label: "SKYLINE RADIO", href: "/v3/explore/radio", note: "Sélections · DJ · mixes · lecteur" },
  ] },
  { label: "CLUB", href: "/v3/club", note: "Carte membre · accès aux 4 espaces", children: [
    { label: "MY SPACE", href: "/v3/club/space", note: "Profil membre · visibilité" },
    { label: "MEMBERS (annuaire)", href: "/v3/club/members", note: "Recherche ville + affinités", children: [
      { label: "Fiche membre · demande de contact", href: "/v3/club/members/m4" },
    ] },
    { label: "MESSAGES", href: "/v3/club/messages", note: "Demandes · conversations", children: [
      { label: "Conversation", href: "/v3/club/messages/m1" },
    ] },
    { label: "SOUVENIRS", href: "/v3/club/memories", note: "Archives officielles" },
  ] },
  { label: "PROFIL & PARAMÈTRES (via l'avatar)", href: "/v3/profile", note: "Confidentialité · blocages · notifications · données" },
  { label: "SKYLINE HQ (organisateurs, environnement séparé)", href: "/v3/wireframes#hq", note: "Wireframe" },
];
