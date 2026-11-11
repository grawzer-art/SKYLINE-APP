import { redirect } from "next/navigation";

/** L'accueil de l'application est SKYLINE V3 (`/v3`). Le choix de l'espace (/start) et la mémoire STAFF sont traités en amont par src/proxy.ts. */
export default function HomePage() { redirect("/v3"); }
