/**
 * NOTIFICATIONS PARTICIPANTS — catégories et règles pures, distinctes de STAFF (aucune catégorie en commun, aucune donnée STAFF).
 * AUCUN FAUX ÉVÉNEMENT : la boîte est alimentée par les communications OFFICIELLES de l'organisation (source : base, phase suivante).
 * En phase 1 elle est vide par défaut ; des EXEMPLES de démonstration peuvent être affichés à la demande, toujours marqués « Exemple ».
 */
export type ParticipantCategory = "artists" | "flight" | "program" | "departure" | "official";
export const PARTICIPANT_CATEGORIES: readonly { id: ParticipantCategory; label: string; hint: string }[] = [
  { id: "artists", label: "Annonces d'artistes", hint: "Nouveaux noms et sets annoncés" },
  { id: "flight", label: "Informations de vol", hint: "Horaires, embarquement, consignes de voyage" },
  { id: "program", label: "Programme", hint: "Modifications du programme" },
  { id: "departure", label: "Rappels avant le départ", hint: "Documents, bagages, rendez-vous" },
  { id: "official", label: "Communications officielles", hint: "Messages importants de l'organisation (les urgents s'affichent toujours)" },
];
export type ParticipantPrefs = { categories: Record<ParticipantCategory, boolean>; push: boolean };
export const defaultParticipantPrefs = (): ParticipantPrefs => ({ categories: { artists: true, flight: true, program: true, departure: true, official: true }, push: false });
export function normalizeParticipantPrefs(raw: unknown): ParticipantPrefs {
  const d = defaultParticipantPrefs(); if (!raw || typeof raw !== "object") return d; const r = raw as Partial<ParticipantPrefs>;
  const categories = { ...d.categories }; for (const c of PARTICIPANT_CATEGORIES) if (typeof r.categories?.[c.id] === "boolean") categories[c.id] = r.categories[c.id];
  return { categories, push: r.push === true };
}

export type ParticipantNotification = { id: string; category: ParticipantCategory; title: string; body: string; at: string; urgent?: boolean; /** Exemple de démonstration. */ sample?: boolean };
/** Les communications officielles URGENTES ne peuvent pas être masquées. */
export const isParticipantVisible = (n: ParticipantNotification, p: ParticipantPrefs) => (n.category === "official" && n.urgent) || p.categories[n.category];
export const participantUnread = (l: ParticipantNotification[], read: ReadonlySet<string>) => l.filter((n) => !read.has(n.id)).length;

/** Exemples de démonstration (FR / EN) : contenu volontairement GÉNÉRIQUE (aucun nom d'artiste, horaire ou numéro de vol inventé). */
export const participantSamples = (now: number, locale: "fr" | "en" = "fr"): ParticipantNotification[] => {
  const iso = (h: number) => new Date(now - h * 3_600_000).toISOString(); const en = locale === "en";
  return [
    { id: "sample:p1", category: "official", title: en ? "Example of an official message" : "Exemple de communication officielle", body: en ? "Placeholder text: an important message from the organisers would appear here." : "Texte fictif : ici s'afficherait un message important de l'organisation.", at: iso(1), urgent: true, sample: true },
    { id: "sample:p2", category: "artists", title: en ? "Example of an artist announcement" : "Exemple d'annonce d'artiste", body: en ? "Placeholder text: an artist announcement would appear here." : "Texte fictif : ici s'afficherait l'annonce d'un artiste.", at: iso(6), sample: true },
    { id: "sample:p3", category: "flight", title: en ? "Example of flight information" : "Exemple d'information de vol", body: en ? "Placeholder text: times and instructions to be provided by the team." : "Texte fictif : horaires et consignes à renseigner par l'équipe.", at: iso(26), sample: true },
    { id: "sample:p4", category: "program", title: en ? "Example of a programme change" : "Exemple de modification du programme", body: en ? "Placeholder text: a programme change would be shown here." : "Texte fictif : un changement du programme serait indiqué ici.", at: iso(30), sample: true },
    { id: "sample:p5", category: "departure", title: en ? "Example of a pre-departure reminder" : "Exemple de rappel avant le départ", body: en ? "Placeholder text: a reminder about documents or meeting points." : "Texte fictif : rappel de documents ou de rendez-vous.", at: iso(48), sample: true },
  ];
};
