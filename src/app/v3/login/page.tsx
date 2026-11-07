import { Suspense } from "react";
import { ParticipantLogin } from "@/components/participant/ParticipantLogin";

/** Connexion participants (protégée par src/proxy.ts : inexistante si PARTICIPANT_AUTH est désactivée). */
export default function Page() { return <Suspense fallback={null}><ParticipantLogin /></Suspense>; }
