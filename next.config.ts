import type { NextConfig } from "next";
import { legacyRedirects } from "./src/components/layout/nav-items";
import { demoContentAllowed } from "./src/lib/experience/demoContent";

const nextConfig: NextConfig = {
  // Permet de construire une seconde copie (tests du mode Supabase) sans écraser la construction principale.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  /* config options here */
  cacheComponents: true,
  // Contenus de démonstration : décision prise AU BUILD (voir src/lib/experience/demoContent.ts). Fermée par défaut ; jamais sur Vercel.
  env: { SKYLINE_DEMO_BUILD: demoContentAllowed({ SKYLINE_REVIEW_MODE: process.env.SKYLINE_REVIEW_MODE, VERCEL: process.env.VERCEL, VERCEL_ENV: process.env.VERCEL_ENV }) ? "on" : "off" },
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
