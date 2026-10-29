import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { LoginScreen } from "@/components/staff/LoginScreen";
import { staffAuthMode } from "@/lib/staff/mode";

/** Connexion STAFF (mode Supabase). Mode évalué À LA REQUÊTE : en mode démonstration la page n'existe pas (le proxy redirige vers /staff/access). */
async function Gate() {
  await connection();
  if (staffAuthMode() !== "supabase") notFound();
  return <LoginScreen />;
}
export default function Page() { return <Suspense><Gate /></Suspense>; }
