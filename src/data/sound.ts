import type { VisualKey } from "./visuals";

/**
 * SKYLINE SOUND — collections musicales.
 *
 * ▶ POUR RENSEIGNER UNE PLAYLIST : collez l'URL publique SoundCloud (https://soundcloud.com/…/sets/…) dans `soundcloudUrl`.
 *   Elle doit autoriser l'intégration (réglage « Embeddable » sur SoundCloud) et appartenir à SKYLINE
 *   ou à un ayant droit qui a donné son accord. Laisser `null` = « bientôt disponible ». N'INVENTEZ PAS de lien.
 */
export type SoundCollection = { id: string; title: string; genre: string; tagline: string; cover: VisualKey; coverPosition?: string; soundcloudUrl: string | null;
  /** Droits d'usage/diffusion : seul « confirmed » est servi aux participants. Défaut sûr : tout lien est considéré « pending ». */
  rights?: "confirmed" | "pending" };

export const soundCollections: SoundCollection[] = [
  { id: "sunset-club", title: "Sunset Club", genre: "Afro House / Melodic House", tagline: "Quand le soleil touche la mer.", cover: "sunset",
    // TEST DE VALIDATION (provisoire) : playlist publique d'un tiers, sélection Afro House / Ibiza Sunset.
    // Droits d'usage NON confirmés → `rights: "pending"` : NON SERVIE aux participants (revue locale uniquement).
    // Remplacer par une playlist SKYLINE ou autorisée, puis passer `rights` à "confirmed".
    rights: "pending",
    soundcloudUrl: "https://soundcloud.com/andres-jaramillo-718256361/sets/black-coffee-2026-ibiza-chill" },
  { id: "above-the-clouds", title: "Above The Clouds", genre: "Deep House / Chill", tagline: "Au-dessus des nuages, tout ralentit.", cover: "blue", soundcloudUrl: null },
  { id: "after-hours", title: "After Hours", genre: "Tech House / Club", tagline: "Quand la nuit prend le relais.", cover: "laser", soundcloudUrl: null },
  { id: "island-mode", title: "Island Mode", genre: "Summer / Feel Good", tagline: "Le son de l'été, sans effort.", cover: "warm", soundcloudUrl: null },
];

/**
 * Collections servies à l'interface. Un lien dont les droits ne sont pas confirmés est retiré (« bientôt disponible »),
 * sauf en revue locale. SERVEUR UNIQUEMENT : les composants clients reçoivent le résultat en props.
 */
export function getSoundCollections(demoOk: boolean): SoundCollection[] {
  return soundCollections.map((c) => (c.soundcloudUrl && c.rights !== "confirmed" && !demoOk ? { ...c, soundcloudUrl: null } : c));
}
