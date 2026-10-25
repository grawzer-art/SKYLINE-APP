import type { MetadataRoute } from "next";

/** Base PWA : installable sur l'écran d'accueil. Service worker / hors-ligne : phase suivante. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SKYLINE",
    short_name: "SKYLINE",
    description: "SKYLINE IBIZA 2027 — démonstration",
    start_url: "/",
    display: "standalone",
    background_color: "#080A0D",
    theme_color: "#080A0D",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
