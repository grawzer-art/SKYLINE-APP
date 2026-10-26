/**
 * Types et utilitaires purs de SKYLINE SIGNAL — sans aucune donnée : importables côté client sans rien exposer.
 * Les contenus (dont les brouillons) vivent dans `signals.ts`, réservé au serveur.
 */
export type SignalType = "artist" | "location" | "mix";
export type SignalStatus = "published" | "draft";

export type SignalImage = {
  src?: string;
  alt: string;
  /** Cadrage CSS (object-position) pour iPhone portrait. */
  position?: string;
  /** Description de l'asset attendu, affichée si l'image manque. */
  slot: string;
};

/** Média facultatif. Aucune lecture automatique : l'utilisateur déclenche. `src` absent = « indisponible ». */
export type SignalMedia =
  | { kind: "audio"; src?: string; title: string; durationLabel?: string }
  | { kind: "video"; src?: string; poster?: string; title: string };

export type Signal = {
  id: string;
  slug: string;
  type: SignalType;
  title: string;
  /** Accroche : une ligne. */
  hook: string;
  description: string[];
  /** ISO 8601. */
  publishedAt: string;
  status: SignalStatus;
  image: SignalImage;
  media?: SignalMedia;
  /** Lien complémentaire (profil, contenu musical autorisé…). Externe → nouvel onglet. */
  link?: { label: string; href: string };
  /** Champs propres au type. */
  artistName?: string;
  locationName?: string;
  mixTitle?: string;
  djName?: string;
  /** Informations complémentaires validées (lieu). */
  facts?: { label: string; value: string }[];
  /** Contenu fictif de démonstration. */
  demo: boolean;
};

export const signalTypeLabels: Record<SignalType, { label: string; tone: "sunset" | "sky" }> = {
  artist: { label: "Artist Reveal", tone: "sunset" }, // orange : révélations musicales
  mix: { label: "Exclusive Mix", tone: "sunset" },
  location: { label: "Location Reveal", tone: "sky" },
};

export function formatSignalDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Paris" });
}
