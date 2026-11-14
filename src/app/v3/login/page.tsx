import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { ParticipantLogin } from "@/components/participant/ParticipantLogin";
import { signupConfig } from "@/lib/participant/config";

export const metadata: Metadata = { title: "Connexion" };

/** Le lien « Créer un compte » n'existe que si l'inscription est ouverte : configuration relue à CHAQUE requête (jamais figée au build). */
async function Login() { await connection(); return <ParticipantLogin signupEnabled={signupConfig().mode === "on"} />; }
/** Connexion participants (protégée par src/proxy.ts : inexistante si PARTICIPANT_AUTH est désactivée). */
export default function Page() { return <Suspense fallback={null}><Login /></Suspense>; }
