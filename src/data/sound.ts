import type { VisualKey } from "./visuals";

/**
 * SKYLINE SOUND — collections musicales.
 *
 * ▶ POUR RENSEIGNER UNE PLAYLIST : collez l'URL publique SoundCloud (https://soundcloud.com/…/sets/…) dans `soundcloudUrl`.
 *   Elle doit autoriser l'intégration (réglage « Embeddable » sur SoundCloud) et appartenir à SKYLINE
 *   ou à un ayant droit qui a donné son accord. Laisser `null` = « bientôt disponible ». N'INVENTEZ PAS de lien.
 */
export type SoundCollection = { id: string; title: string; genre: string; tagline: string; cover: VisualKey; coverPosition?: string; soundcloudUrl: string | null };

export const soundCollections: SoundCollection[] = [
  { id: "sunset-club", title: "Sunset Club", genre: "Afro House / Melodic House", tagline: "Quand le soleil touche la mer.", cover: "sunset",
    // TEST DE VALIDATION (provisoire) : playlist publique d'un tiers (compte « LUK »), choisie pour tester le lecteur avec de la vraie musique.
    // Intégration et droits NON confirmés : à remplacer par une playlist SKYLINE (ou autorisée) avant toute mise en production.
    soundcloudUrl: "https://soundcloud.com/luk_music/sets/afro-house-remix-songs-afro" },
  { id: "above-the-clouds", title: "Above The Clouds", genre: "Deep House / Chill", tagline: "Au-dessus des nuages, tout ralentit.", cover: "blue", soundcloudUrl: null },
  { id: "after-hours", title: "After Hours", genre: "Tech House / Club", tagline: "Quand la nuit prend le relais.", cover: "laser", soundcloudUrl: null },
  { id: "island-mode", title: "Island Mode", genre: "Summer / Feel Good", tagline: "Le son de l'été, sans effort.", cover: "warm", soundcloudUrl: null },
];
