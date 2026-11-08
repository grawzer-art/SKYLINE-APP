import { NextResponse } from "next/server";
import { connection } from "next/server";
import { participantConfig } from "@/lib/participant/config";
import { loadParticipantAccess, loadParticipantProfile } from "@/lib/participant/access";
import { createServerSupabase } from "@/lib/supabase/server";

const noStore = { "Cache-Control": "private, no-store" };
/** Statut voyageur : preuve CÔTÉ BASE (réservation confirmée par l'équipe). « unknown » si la fonction n'existe pas encore (migration B4.2 non appliquée) : jamais « verified » par défaut. */
async function travelerStatus(supabase: Awaited<ReturnType<typeof createServerSupabase>>): Promise<"none" | "verified" | "unknown"> {
  try { const { data, error } = await supabase.rpc("get_my_traveler_status"); if (error) return "unknown"; return data === "verified" ? "verified" : data === "none" ? "none" : "unknown"; } catch { return "unknown"; }
}
/**
 * IDENTITÉ du participant connecté (informative pour l'interface ; les droits réels sont revérifiés par le proxy pour les pages personnelles et par la base).
 * Ne renvoie QUE les données de l'utilisateur lui-même : jamais celles d'un autre. Utilisateur vérifié auprès de Supabase (`getUser`), jamais `getSession`.
 *  off → { mode: "off" } · misconfigured → erreur explicite · anonymous · no_access · ready (+ profil éventuel)
 */
export async function GET() {
  await connection();
  const cfg = participantConfig();
  if (cfg.mode === "off") return NextResponse.json({ mode: "off" }, { headers: noStore });
  if (cfg.mode === "misconfigured") return NextResponse.json({ mode: "misconfigured", configError: cfg.issue }, { headers: noStore });
  try {
    const supabase = await createServerSupabase(); const { data } = await supabase.auth.getUser();
    if (!data.user) return NextResponse.json({ mode: "supabase", status: "anonymous" }, { headers: noStore });
    if (!(await loadParticipantAccess(supabase, data.user.id))) return NextResponse.json({ mode: "supabase", status: "no_access" }, { headers: noStore });
    const p = await loadParticipantProfile(supabase, data.user.id); const traveler = await travelerStatus(supabase);
    if (!p.ok) return NextResponse.json(p.unavailable ? { mode: "supabase", status: "ready", email: data.user.email ?? "", profile: null, profileAvailable: false, traveler } : { mode: "supabase", status: "error" }, { headers: noStore });
    return NextResponse.json({ mode: "supabase", status: "ready", email: data.user.email ?? "", profile: p.profile, profileAvailable: true, traveler }, { headers: noStore });
  } catch { return NextResponse.json({ mode: "supabase", status: "error" }, { headers: noStore }); }
}
