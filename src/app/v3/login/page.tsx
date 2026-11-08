import { Suspense } from "react";
import { connection } from "next/server";
import { ParticipantLogin } from "@/components/participant/ParticipantLogin";
import { signupConfig } from "@/lib/participant/config";

/** Connexion participants (protégée par src/proxy.ts : inexistante si PARTICIPANT_AUTH est désactivée). Le lien « Créer un compte » n'existe que si l'inscription est ouverte. */
export default async function Page() { await connection(); return <Suspense fallback={null}><ParticipantLogin signupEnabled={signupConfig().mode === "on"} /></Suspense>; }
