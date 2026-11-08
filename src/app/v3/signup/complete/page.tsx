import { connection } from "next/server";
import { notFound } from "next/navigation";
import { SignupComplete } from "@/components/participant/SignupComplete";
import { signupConfig } from "@/lib/participant/config";

/** Finalisation après lien magique (session requise : vérifiée par src/proxy.ts). */
export default async function Page() {
  await connection(); const c = signupConfig(); if (c.mode !== "on") notFound();
  return <SignupComplete view={{ termsVersion: c.termsVersion, termsUrl: c.termsUrl, charterUrl: c.charterUrl, minAge: c.minAge, captcha: null }} />;
}
