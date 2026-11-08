import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { SignupComplete } from "@/components/participant/SignupComplete";
import { signupConfig } from "@/lib/participant/config";

async function Complete() {
  await connection(); const c = signupConfig(); if (c.mode !== "on") notFound();
  return <SignupComplete view={{ termsVersion: c.termsVersion, termsUrl: c.termsUrl, charterUrl: c.charterUrl, minAge: c.minAge, captcha: null }} />;
}
/** Finalisation après lien magique (session requise : vérifiée par src/proxy.ts). */
export default function Page() { return <Suspense fallback={null}><Complete /></Suspense>; }
