/**
 * Visuels d'ambiance — découpes SANS PERSONNE des photographies authentiques de la première édition
 * (coucher de soleil, aéroport, plafonds de cabine). Servent de vignettes et de pochettes provisoires ;
 * à remplacer par les visuels officiels (pochettes, portraits) dès leur réception.
 */
export const visuals = {
  sunset: "/visuals/sunset.jpg",
  airport: "/visuals/airport.jpg",
  ceiling: "/visuals/ceiling.jpg",
  warm: "/visuals/warm.jpg",
  blue: "/visuals/blue.jpg",
  laser: "/visuals/laser.jpg",
} as const;
export type VisualKey = keyof typeof visuals;
