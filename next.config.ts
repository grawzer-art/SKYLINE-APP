import type { NextConfig } from "next";
import { legacyRedirects } from "./src/components/layout/nav-items";

const nextConfig: NextConfig = {
  // Permet de construire une seconde copie (tests du mode Supabase) sans écraser la construction principale.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  /* config options here */
  cacheComponents: true,
  async redirects() {
    // Anciennes routes participants → V3 (table unique et testée : src/components/layout/nav-items.ts). La route « / » est traitée par src/proxy.ts (choix de l'espace d'abord).
    return legacyRedirects.map((r) => ({ ...r, permanent: false }));
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
