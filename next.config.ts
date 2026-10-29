import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permet de construire une seconde copie (tests du mode Supabase) sans écraser la construction principale.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  /* config options here */
  cacheComponents: true,
  async redirects() {
    // Les onglets MY FLIGHT et CLUB mènent aux écrans V3 ; anciennes routes V1/V2 conservées en redirection.
    return [
      { source: "/flight", destination: "/v3/flight", permanent: false },
      { source: "/club", destination: "/v3/club", permanent: false },
      { source: "/pass", destination: "/v3/flight", permanent: false },
      { source: "/more", destination: "/", permanent: false },
      // SKYLINE RADIO devient SKYLINE SOUND (lecteur SoundCloud officiel).
      { source: "/v3/explore/radio", destination: "/v3/explore/sound", permanent: false },
    ];
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
