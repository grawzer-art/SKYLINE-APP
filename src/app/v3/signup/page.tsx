import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { SignupFlow } from "@/components/participant/SignupFlow";
import { signupConfig } from "@/lib/participant/config";

export const metadata: Metadata = { title: "Inscription" };

async function Signup() {
  await connection(); const c = signupConfig(); if (c.mode !== "on") notFound();
  return <SignupFlow view={{ termsVersion: c.termsVersion, termsUrl: c.termsUrl, charterUrl: c.charterUrl, minAge: c.minAge, captcha: c.captcha }} />;
}
/** Inscription publique (protégée par src/proxy.ts : inexistante tant que PARTICIPANT_SIGNUP n'est pas « on »). La configuration est relue à chaque requête. */
export default function Page() { return <Suspense fallback={null}><Signup /></Suspense>; }
