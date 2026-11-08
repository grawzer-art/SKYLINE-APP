import { connection } from "next/server";
import { SignupFlow } from "@/components/participant/SignupFlow";
import { signupConfig } from "@/lib/participant/config";
import { notFound } from "next/navigation";

/** Inscription publique (protégée par src/proxy.ts : inexistante tant que PARTICIPANT_SIGNUP n'est pas « on »). La configuration est relue à chaque requête. */
export default async function Page() {
  await connection(); const c = signupConfig(); if (c.mode !== "on") notFound();
  return <SignupFlow view={{ termsVersion: c.termsVersion, termsUrl: c.termsUrl, charterUrl: c.charterUrl, minAge: c.minAge, captcha: c.captcha }} />;
}
