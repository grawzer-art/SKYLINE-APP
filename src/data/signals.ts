/**
 * SKYLINE SIGNAL — révélations privées. Fichier central, réutilisable.
 *
 * ⚠️ CONTENUS DE DÉMONSTRATION : aucun artiste, lieu ou mix n'est réel (`demo: true`, signalé à l'écran).
 * Remplacer par les contenus officiels dès leur réception ; les photos viennent de `public/photos/`.
 * Un Signal « draft » n'apparaît nulle part (ni HOME, ni EXPLORE, ni route directe).
 *
 * 🔒 SERVEUR UNIQUEMENT : ne jamais importer ce fichier depuis un composant "use client" — il contient les brouillons.
 * Les composants clients reçoivent uniquement des Signaux publiés, en props, depuis une page ou un layout serveur.
 */
import { images } from "@/data/demo";
import type { Signal } from "@/data/signal-types";


const signals: Signal[] = [
  {
    id: "sig-location-demo", slug: "un-lieu-a-ibiza-se-devoile", type: "location", status: "published", demo: true,
    publishedAt: "2026-10-24T10:00:00+02:00",
    title: "Un lieu à Ibiza se dévoile",
    hook: "Première révélation de la programmation.",
    description: [
      "Ici s'afficherait la présentation officielle d'un lieu de l'édition, réservée aux membres avant sa diffusion publique.",
      "Contenu de démonstration : aucun lieu n'est confirmé.",
    ],
    locationName: "Lieu à confirmer",
    facts: [{ label: "Statut", value: "À confirmer" }],
    image: { src: images.airport, alt: "Arrivée à l'aéroport d'Ibiza, de nuit, photographie de la première édition", position: "50% 55%", slot: "Photo officielle du lieu · 4:5" },
    link: { label: "Toutes les révélations", href: "/explore" },
  },
  {
    id: "sig-artist-demo", slug: "un-premier-nom-rejoint-la-line-up", type: "artist", status: "published", demo: true,
    publishedAt: "2026-10-17T10:00:00+02:00",
    title: "Un premier nom rejoint la line-up",
    hook: "Un contenu privé vous attend.",
    description: [
      "Ici s'afficherait l'annonce officielle d'un artiste, avec sa photo, une courte présentation et un lien vers un contenu musical autorisé.",
      "Contenu de démonstration : aucun artiste n'est confirmé.",
    ],
    artistName: "Artiste à confirmer",
    // Pas de photo : une annonce fictive ne doit pas reposer sur le visage d'une vraie personne.
    image: { alt: "", slot: "Portrait officiel de l'artiste · 4:5" },
  },
  {
    id: "sig-mix-demo", slug: "un-mix-a-ecouter-avant-le-depart", type: "mix", status: "published", demo: true,
    publishedAt: "2026-10-09T10:00:00+02:00",
    title: "Un mix à écouter avant le départ",
    hook: "Réservé aux membres.",
    description: [
      "Ici s'afficherait un mix exclusif, avec sa pochette et un lecteur — uniquement si une source audio autorisée est fournie.",
      "Contenu de démonstration : aucune source audio n'est intégrée.",
    ],
    mixTitle: "Mix à confirmer", djName: "DJ à confirmer",
    media: { kind: "audio", title: "Mix à confirmer" }, // src absent → « média indisponible »
    image: { src: images.before, alt: "Coucher de soleil vu du hublot, photographie de la première édition", position: "30% 70%", slot: "Pochette officielle du mix · 1:1" },
  },
  {
    id: "sig-draft-demo", slug: "brouillon-non-publie", type: "artist", status: "draft", demo: true,
    publishedAt: "2026-11-02T10:00:00+01:00",
    title: "Brouillon non publié", hook: "Ne doit apparaître nulle part.", description: ["Brouillon de démonstration."],
    image: { alt: "", slot: "—" },
  },
];

/** Révélations publiées, de la plus récente à la plus ancienne. */
export function getPublishedSignals(): Signal[] {
  return signals.filter((s) => s.status === "published").sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
}
/** La révélation prioritaire de HOME : la plus récente publiée. */
export const getFeaturedSignal = (): Signal | undefined => getPublishedSignals()[0];
export const getSignalBySlug = (slug: string): Signal | undefined => getPublishedSignals().find((s) => s.slug === slug);
